import { emailQueue, EmailJobData } from "../queues/emailQueue";
import { Job } from "bullmq";

/**
 * Schedules an email job in BullMQ using calculated delay without cron libraries.
 * Uses jobId: emailJobId for idempotency to prevent duplicate scheduling.
 */
export async function scheduleEmailJob(
  emailJobId: string,
  scheduledAt: Date
): Promise<Job<EmailJobData>> {
  const delay = scheduledAt.getTime() - Date.now();
  const calculatedDelay = Math.max(0, delay);

  const job = await emailQueue.add(
    "send-email",
    { emailJobId },
    {
      delay: calculatedDelay,
      jobId: emailJobId,
    }
  );

  console.log(
    `[EmailScheduler] Scheduled emailJobId ${emailJobId} with delay of ${calculatedDelay}ms (Job ID: ${job.id})`
  );

  return job;
}
