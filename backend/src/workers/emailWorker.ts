import { Worker, Job, DelayedError } from "bullmq";
import dotenv from "dotenv";
import { redisConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { getTransporter } from "../lib/mailer";
import { EMAIL_QUEUE_NAME, EmailJobData } from "../queues/emailQueue";
import { checkAndIncrementHourlyRateLimit, getMsUntilNextHour } from "../services/rateLimiter";
import { sendSlackRateLimitAlert } from "../services/slackService";
import { indexEmailJob } from "../services/emailIndexer";
import nodemailer from "nodemailer";

dotenv.config();

const concurrency = Number(process.env.WORKER_CONCURRENCY) || 5;
const interEmailDelayMs = Number(process.env.DELAY_BETWEEN_EMAILS_MS) || 2000;
const maxEmailsPerHour = Number(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER) || 200;

/**
 * BullMQ Worker processing email sending jobs.
 */
export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { emailJobId } = job.data;
    console.log(`[EmailWorker] Processing job ${job.id} for emailJobId: ${emailJobId}`);

    // 1. Fetch EmailJob record from database
    const emailJob = await prisma.emailJob.findUnique({
      where: { id: emailJobId },
    });

    if (!emailJob) {
      console.warn(`[EmailWorker] EmailJob ${emailJobId} not found in database. Skipping.`);
      return;
    }

    if (emailJob.status === "SENT") {
      console.log(`[EmailWorker] EmailJob ${emailJobId} already sent. Skipping.`);
      return;
    }

    // 2. Enforce inter-email delay before sending
    if (interEmailDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, interEmailDelayMs));
    }

    // 3. Atomic Redis rate limit check per sender
    const senderEmail = emailJob.senderEmail || "default-sender@scheduler.com";
    const { allowed, currentCount } = await checkAndIncrementHourlyRateLimit(
      senderEmail,
      maxEmailsPerHour
    );

    if (!allowed) {
      console.warn(
        `[EmailWorker] Rate limit exceeded for sender ${senderEmail} (${currentCount}/${maxEmailsPerHour}).`
      );

      // Trigger Slack webhook alert for user/tenant
      await sendSlackRateLimitAlert(
        emailJob.userId,
        senderEmail,
        currentCount,
        maxEmailsPerHour
      );

      // Calculate delay until the next hour window
      const nextHourDelay = getMsUntilNextHour();
      console.log(
        `[EmailWorker] Rescheduling job ${job.id} with delay of ${nextHourDelay}ms until next hour window.`
      );

      // Move job to delayed state in BullMQ without failing it
      await job.moveToDelayed(Date.now() + nextHourDelay, job.token);
      throw new DelayedError();
    }

    // 4. Send email using Nodemailer / Ethereal SMTP
    try {
      const transporter = await getTransporter();

      const info = await transporter.sendMail({
        from: senderEmail,
        to: emailJob.recipient,
        subject: emailJob.subject,
        text: emailJob.body,
        html: `<p>${emailJob.body.replace(/\n/g, "<br/>")}</p>`,
      });

      console.log(`[EmailWorker] Email delivered successfully! MessageID: ${info.messageId}`);
      
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EmailWorker] Ethereal Email Preview URL: ${previewUrl}`);
      }

      // 5. Update Postgres EmailJob status to SENT & sync Elasticsearch
      const updatedJob = await prisma.emailJob.update({
        where: { id: emailJob.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
      await indexEmailJob(updatedJob);

      return { status: "SENT", messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailWorker] Failed to send email for emailJobId ${emailJobId}:`, err);

      // Check if job retries are exhausted or mark FAILED
      if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
        const failedJob = await prisma.emailJob.update({
          where: { id: emailJob.id },
          data: {
            status: "FAILED",
          },
        });
        await indexEmailJob(failedJob);
      }

      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`[EmailWorker] Job ${job.id} completed successfully.`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed: ${err.message}`);
});
