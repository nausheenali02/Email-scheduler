import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

export interface EmailJobData {
  emailJobId: string;
}

export const EMAIL_QUEUE_NAME = "email-queue";

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});
