import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { prisma } from "./lib/prisma";
import { emailQueue } from "./queues/emailQueue";
import { redisConnection } from "./lib/redis";
import { emailWorker } from "./workers/emailWorker";
import { ensureEmailIndex } from "./lib/elasticsearch";
import { emailRouter } from "./routes/emailRoutes";
import { slackRouter } from "./routes/slackRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Setup Bull-Board Dashboard UI for Redis queue monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

// Mount API REST endpoints under /api
app.use("/api/emails", emailRouter);
app.use("/api/slack", slackRouter);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "Email Scheduler Backend",
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Bull-Board Dashboard running on http://localhost:${PORT}/admin/queues`);
  console.log(`⚙️ BullMQ Email Worker started with concurrency ${process.env.WORKER_CONCURRENCY || 5}`);

  // Initialize Elasticsearch index
  await ensureEmailIndex();
});

process.on("SIGINT", async () => {
  console.log("Shutting down backend server & worker...");
  await emailWorker.close();
  await prisma.$disconnect();
  await redisConnection.quit();
  server.close(() => {
    process.exit(0);
  });
});
