import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const slackRouter = Router();

/**
 * POST /api/slack/connect
 * Saves or updates incoming Slack webhook URL / token into SlackIntegration for the user.
 */
slackRouter.post("/connect", async (req: Request, res: Response) => {
  try {
    const { userId: inputUserId, webhookUrl, accessToken = "slack-token-default", channel } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: "webhookUrl is required." });
    }

    // Ensure user exists
    let userId = inputUserId;
    if (!userId) {
      const defaultUser = await prisma.user.upsert({
        where: { email: "default.user@scheduler.com" },
        update: {},
        create: { email: "default.user@scheduler.com", name: "Default Scheduler User" },
      });
      userId = defaultUser.id;
    }

    const existing = await prisma.slackIntegration.findFirst({
      where: { userId },
    });

    let integration;
    if (existing) {
      integration = await prisma.slackIntegration.update({
        where: { id: existing.id },
        data: {
          webhookUrl,
          accessToken,
          channel: channel || existing.channel,
        },
      });
    } else {
      integration = await prisma.slackIntegration.create({
        data: {
          userId,
          webhookUrl,
          accessToken,
          channel: channel || null,
        },
      });
    }

    return res.status(200).json({
      message: "Slack integration saved successfully.",
      integration,
    });
  } catch (error: any) {
    console.error("[SlackRoutes] Failed to save Slack integration:", error);
    return res.status(500).json({ error: "Internal server error saving Slack integration." });
  }
});
