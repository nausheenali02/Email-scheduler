import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { scheduleEmailJob } from "../services/emailScheduler";
import { indexEmailJob, searchEmailsInES } from "../services/emailIndexer";

export const emailRouter = Router();

// Helper to ensure default user exists if userId is omitted
async function getOrCreateDefaultUser(userId?: string, email?: string): Promise<string> {
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user.id;
  }

  const userEmail = email || "default.user@scheduler.com";
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: "Default Scheduler User",
    },
  });

  return user.id;
}

/**
 * POST /api/emails/schedule
 * Schedules single or batch email jobs, enqueues in BullMQ, and indexes in Elasticsearch.
 */
emailRouter.post("/schedule", async (req: Request, res: Response) => {
  try {
    const {
      userId: inputUserId,
      senderEmail = "sender@scheduler.com",
      recipient,
      leads,
      subject,
      body,
      scheduledAt,
      delayBetweenEmails = 2000,
    } = req.body;

    // Validation
    if (!subject || !body) {
      return res.status(400).json({ error: "Missing required fields: subject and body are mandatory." });
    }

    const recipientsList: string[] = [];
    if (Array.isArray(leads) && leads.length > 0) {
      recipientsList.push(...leads.map((l: any) => (typeof l === "string" ? l : l.email)));
    } else if (typeof recipient === "string" && recipient.trim().length > 0) {
      recipientsList.push(recipient.trim());
    }

    if (recipientsList.length === 0) {
      return res.status(400).json({ error: "At least one recipient or lead email address must be provided." });
    }

    const userId = await getOrCreateDefaultUser(inputUserId, senderEmail);

    const baseScheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();
    if (isNaN(baseScheduledDate.getTime())) {
      return res.status(400).json({ error: "Invalid scheduledAt date format." });
    }

    const createdJobs = [];
    let currentDelayOffset = 0;

    for (const rec of recipientsList) {
      const scheduledTime = new Date(baseScheduledDate.getTime() + currentDelayOffset);

      // 1. Create DB record in Postgres
      const emailJob = await prisma.emailJob.create({
        data: {
          recipient: rec,
          subject,
          body,
          status: "PENDING",
          scheduledAt: scheduledTime,
          senderEmail,
          userId,
        },
      });

      // 2. Schedule in BullMQ
      await scheduleEmailJob(emailJob.id, scheduledTime);

      // 3. Index in Elasticsearch
      await indexEmailJob(emailJob);

      createdJobs.push(emailJob);
      currentDelayOffset += Number(delayBetweenEmails) || 0;
    }

    return res.status(201).json({
      message: `Successfully scheduled ${createdJobs.length} email job(s).`,
      count: createdJobs.length,
      jobs: createdJobs,
    });
  } catch (error: any) {
    console.error("[EmailRoutes] Failed to schedule emails:", error);
    return res.status(500).json({ error: "Internal server error scheduling emails.", details: error.message });
  }
});

/**
 * GET /api/emails/scheduled
 * Returns paginated emails with status PENDING from Postgres.
 */
emailRouter.get("/scheduled", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const [total, jobs] = await Promise.all([
      prisma.emailJob.count({ where: { status: "PENDING" } }),
      prisma.emailJob.findMany({
        where: { status: "PENDING" },
        skip,
        take: limit,
        orderBy: { scheduledAt: "asc" },
      }),
    ]);

    return res.status(200).json({
      status: "PENDING",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      jobs,
    });
  } catch (error: any) {
    console.error("[EmailRoutes] Error fetching scheduled emails:", error);
    return res.status(500).json({ error: "Internal server error fetching scheduled emails." });
  }
});

/**
 * GET /api/emails/sent
 * Returns paginated emails with status SENT or FAILED from Postgres.
 */
emailRouter.get("/sent", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const where = { status: { in: ["SENT", "FAILED"] as any } };

    const [total, jobs] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      jobs,
    });
  } catch (error: any) {
    console.error("[EmailRoutes] Error fetching sent/failed emails:", error);
    return res.status(500).json({ error: "Internal server error fetching sent emails." });
  }
});

/**
 * GET /api/emails/search?q=
 * Performs multi-match full-text search against the Elasticsearch emails index on subject, recipient, and body.
 */
emailRouter.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Search query string 'q' is required." });
    }

    const searchTerm = query.trim();
    let results = await searchEmailsInES(searchTerm);

    // Hybrid Fallback: If Elasticsearch is indexing or empty, query Postgres DB directly!
    if (results.length === 0) {
      const dbJobs = await prisma.emailJob.findMany({
        where: {
          OR: [
            { subject: { contains: searchTerm, mode: "insensitive" } },
            { recipient: { contains: searchTerm, mode: "insensitive" } },
            { body: { contains: searchTerm, mode: "insensitive" } },
            { senderEmail: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      results = dbJobs;
    }

    return res.status(200).json({
      query: searchTerm,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error("[EmailRoutes] Search query error:", error);
    return res.status(500).json({ error: "Internal server error searching emails." });
  }
});
