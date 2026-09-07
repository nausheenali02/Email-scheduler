# 📧Full-Stack Email Scheduler

A resilient, scalable TypeScript monorepo application for scheduled email dispatching. Built with Express, Redis, PostgreSQL (Prisma), BullMQ, Elasticsearch, and Next.js (App Router).

---

## 📋 Table of Contents
- [🚀 Quickstart & Setup](#-quickstart--setup)
  - [Prerequisites](#prerequisites)
  - [1. Data Infrastructure (Docker)](#1-data-infrastructure-docker)
  - [2. How to Run Backend](#2-how-to-run-backend)
  - [3. How to Run Frontend](#3-how-to-run-frontend)
- [🔑 Ethereal Email Setup & Environment Variables](#-ethereal-email-setup--environment-variables)
  - [Ethereal Email Setup](#ethereal-email-setup)
  - [Backend Environment (`backend/.env`)](#backend-environment-backendenv)
  - [Frontend Environment (`frontend/.env`)](#frontend-environment-frontendenv)
- [🏗️ Architecture Overview](#️-architecture-overview)
  - [1. How Scheduling Works (Cron-Free Delay Queue)](#1-how-scheduling-works-cron-free-delay-queue)
  - [2. How Persistence on Restart is Handled](#2-how-persistence-on-restart-is-handled)
  - [3. How Rate Limiting & Concurrency are Implemented](#3-how-rate-limiting--concurrency-are-implemented)
- [✨ Implemented Features Matrix](#-implemented-features-matrix)
  - [Backend Features](#backend-features)
  - [Frontend Features](#frontend-features)
- [📊 Monitoring & Verification](#-monitoring--verification)

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js v18 or higher
- npm or pnpm
- Docker & Docker Compose (for PostgreSQL, Redis, and Elasticsearch)

---

### 1. Data Infrastructure (Docker)
Start PostgreSQL, Redis, and Elasticsearch containers in detached mode:

```bash
# From workspace root
npm run docker:up
```

This starts:
- **PostgreSQL 16**: `localhost:5433` (DB: `email_scheduler`, User/Pass: `postgres`/`postgres`)
- **Redis 7**: `localhost:6380`
- **Elasticsearch 8.12**: `http://localhost:9200`

To stop containers: `npm run docker:down`

---

### 2. How to Run Backend

The backend comprises an **Express REST API**, **Prisma ORM**, **Elasticsearch indexer**, **Bull-Board Queue Dashboard**, and the **BullMQ Worker Process**.

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Configure Environment Variables
Copy or create `backend/.env` (see full schema in [Environment Variables](#-ethereal-email-setup--environment-variables)):
```bash
cp backend/.env.example backend/.env  # Or create backend/.env directly
```

#### Step 3: Run Database Migrations & Generate Prisma Client
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

#### Step 4: Start Backend Server & BullMQ Worker
```bash
# Run from workspace root:
npm run dev:backend

# Or from backend folder directly:
cd backend
npm run dev
```

The backend server starts on `http://localhost:5001`. On boot, it automatically initializes:
- Express API server
- BullMQ worker instance (`emailWorker`) listening on Redis queue `email-queue`
- Bull-Board Admin Dashboard on `http://localhost:5001/admin/queues`
- Elasticsearch index (`email_jobs`) verification

---

### 3. How to Run Frontend

The frontend is built with **Next.js 14 (App Router)**, **Tailwind CSS**, and **NextAuth.js**.

#### Step 1: Configure Environment Variables
Copy or create `frontend/.env` (see full schema in [Environment Variables](#-ethereal-email-setup--environment-variables)):
```bash
# Create frontend/.env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-32-characters-min"
```

#### Step 2: Start Next.js Development Server
```bash
# Run from workspace root:
npm run dev:frontend

# Or from frontend folder directly:
cd frontend
npm run dev
```

The frontend dashboard will be available at `http://localhost:3000`.

#### Step 3: Log In to Dashboard
- **Default Credentials Login**:
  - Email: `oliver.brown@reachinbox.com`
  - Password: `password123`
- **Google OAuth Login**: Available if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

---

## 🔑 Ethereal Email Setup & Environment Variables

### Ethereal Email Setup

The application uses [Ethereal Email](https://ethereal.email/) (a fake SMTP service) for safe email dispatch testing without sending real emails to real inbox addresses.

#### Automatic Setup (Recommended for Local Dev)
If `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are **omitted** from `backend/.env`, Nodemailer automatically creates a temporary Ethereal test account on backend startup:
1. On sending an email, worker logs output a **Preview URL**:
   `[EmailWorker] Ethereal Email Preview URL: https://ethereal.email/message/XxX...`
2. Open the URL in your browser to view the rendered email, subject, text, and HTML formatting.

#### Manual Setup (Persistent Ethereal Account)
1. Go to [https://ethereal.email/](https://ethereal.email/) and click **Create Ethereal Account**.
2. Copy your generated SMTP credentials into `backend/.env`:
   ```env
   SMTP_HOST=smtp.ethereal.email
   SMTP_PORT=587
   SMTP_USER=your_ethereal_username@ethereal.email
   SMTP_PASS=your_ethereal_password
   ```
3. View sent emails anytime by logging into the Ethereal Email web UI dashboard.

---

### Backend Environment (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5001` | Express server port |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5433/email_scheduler?schema=public` | PostgreSQL connection string |
| `REDIS_URL` | Yes | `redis://localhost:6380` | Redis connection URL for BullMQ & rate limiter |
| `ELASTICSEARCH_URL` | Yes | `http://localhost:9200` | Elasticsearch server URL |
| `WORKER_CONCURRENCY` | No | `5` | Number of jobs processed in parallel by BullMQ worker |
| `DELAY_BETWEEN_EMAILS_MS` | No | `2000` | Minimum throttle delay (ms) between emails |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | No | `200` | Maximum hourly allowed emails per sender address |
| `SMTP_HOST` | No | *(Auto Ethereal)* | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | No | *(Auto Ethereal)* | SMTP username |
| `SMTP_PASS` | No | *(Auto Ethereal)* | SMTP password |
| `SLACK_WEBHOOK_URL` | No | `""` | Global fallback Slack Webhook URL for rate limit alerts |

---

### Frontend Environment (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | NextAuth canonical base URL |
| `NEXTAUTH_SECRET` | Yes | `email-scheduler-nextauth-secret-key-32-chars` | JWT encryption secret |
| `GOOGLE_CLIENT_ID` | No | `""` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | No | `""` | Google OAuth Client Secret |

---

## 🏗️ Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                  NEXT.JS FRONTEND                                 |
|   (Dashboard, Compose Modal, CSV Parser, Status Tables, Elasticsearch Filter)     |
+------------------------------------------+----------------------------------------+
                                           |
                                      HTTP / REST
                                           v
+-----------------------------------------------------------------------------------+
|                                 EXPRESS API SERVER                                |
|   - POST /api/emails/schedule  -> Stores EmailJob in Postgres & Enqueues BullMQ   |
|   - GET  /api/emails           -> Full-text search via Elasticsearch              |
|   - POST /api/slack/webhook    -> Save Slack Webhook configuration                |
|   - GET  /admin/queues         -> Bull-Board Queue Monitor Dashboard              |
+---------------------+--------------------+--------------------+-------------------+
                      |                    |                    |
                      v                    v                    v
           +------------------+    +---------------+    +-------------------+
           |  PostgreSQL 16   |    |    Redis 7    |    | Elasticsearch 8.12|
           | (Prisma Models)  |    | (BullMQ Queue |    |  (Full-Text Email |
           | - User           |    | & Hourly Rate |    |      Indexing)    |
           | - EmailJob       |    |   Counters)   |    +-------------------+
           | - SlackIntegr.   |    +-------+-------+
           +------------------+            |
                                           v
                               +-----------------------+
                               |   BULLMQ EMAIL WORKER |
                               | (Concurrency = N,     |
                               | Throttle = M ms)      |
                               +-----------+-----------+
                                           |
                                    Sends SMTP via
                                           v
                               +-----------------------+
                               |    ETHEREAL / SMTP    |
                               +-----------------------+
```

---

### 1. How Scheduling Works (Cron-Free Delay Queue)

Rather than using background cron polling jobs or interval loops (which suffer from scaling bottlenecks, missed intervals, and database polling overhead), the system relies on **BullMQ's native Redis delay engine**:

1. **Delay Calculation**:
   When `POST /api/emails/schedule` receives a target execution timestamp (`scheduledAt`), it computes the exact millisecond delay relative to current time:
   $$\text{delay} = \max(0, \text{scheduledAt.getTime()} - \text{Date.now()})$$

2. **BullMQ Enqueue**:
   The job is pushed to the BullMQ queue (`email-queue`) with the calculated delay:
   ```typescript
   await emailQueue.add(
     "send-email",
     { emailJobId },
     { delay: calculatedDelay, jobId: emailJobId }
   );
   ```

3. **Redis Sorted Set (`zset`) Execution**:
   BullMQ stores delayed jobs inside a Redis sorted set scored by timestamp (`scheduledAt`). Redis manages the timer natively. When the delay expires, BullMQ automatically moves the job into the active execution stream where the worker picks it up immediately. **Zero cron jobs or polling threads required.**

---

### 2. How Persistence on Restart is Handled

System crash resilience and restart safety are ensured through dual-layer state persistence:

- **Relational Data Persistence (PostgreSQL)**:
  - Every email job record is persisted in PostgreSQL with attributes: `id`, `userId`, `senderEmail`, `recipient`, `subject`, `body`, `status` (`PENDING` | `SENT` | `FAILED`), `scheduledAt`, and `sentAt`.
- **Queue State Persistence (Redis AOF / RDB)**:
  - Pending and delayed BullMQ jobs reside in Redis persistent memory (`redis_data` volume).
- **Restart Recovery Flow**:
  - If the Node.js backend process or server container crashes or restarts:
    1. Redis retains all scheduled timers and pending jobs.
    2. Upon backend boot, the BullMQ `emailWorker` connects to Redis and automatically resumes job processing from where it left off.
    3. No jobs are lost, missed, or re-sent.
- **Idempotency Guarantee**:
  - Jobs are enqueued using `jobId: emailJobId`. Enqueuing the same `emailJobId` multiple times is idempotent in BullMQ, preventing duplicate execution.
  - Before sending, the worker checks PostgreSQL: if `emailJob.status === "SENT"`, execution aborts safely.

---

### 3. How Rate Limiting & Concurrency are Implemented

#### Atomic Hourly Rate Limiting
- **Redis Hourly Key Pattern**:
  `ratelimit:{senderEmail}:{YYYY-MM-DD-HH}`
- **Atomic Counter Pipeline**:
  Evaluates rate limits atomically using a Redis pipeline (`INCR` + `EXPIRE` 3600s):
  ```typescript
  const key = `ratelimit:${senderEmail}:${yyyy}-${mm}-${dd}-${hh}`;
  const pipeline = redisConnection.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 3600, "NX");
  const [ [err1, currentCount] ] = await pipeline.exec();
  ```
- **Next-Hour Automatic Rescheduling**:
  If `currentCount > MAX_EMAILS_PER_HOUR_PER_SENDER`:
  1. Computes exact delay until the next hour window starts:
     $$\text{delayToNextHour} = \text{nextHour.getTime()} - \text{Date.now()}$$
  2. Moves job to delayed state without throwing a job failure:
     ```typescript
     await job.moveToDelayed(Date.now() + delayToNextHour, job.token);
     throw new DelayedError();
     ```
  3. Triggers Slack Webhook rate limit alert notification to configured user webhook URL.

#### Concurrency & Inter-Email Throttling
- **Worker Concurrency**:
  Configured via `WORKER_CONCURRENCY` (default `5`). BullMQ processes $N$ jobs concurrently in parallel workers.
- **Inter-Email Delay Throttling**:
  Configured via `DELAY_BETWEEN_EMAILS_MS` (default `2000` ms). Before processing each SMTP dispatch, the worker enforces a delay to avoid triggering recipient mail server spam filters.

---

## ✨ Implemented Features Matrix

### Backend Features

| Category | Feature | Description | Key Modules |
|---|---|---|---|
| **Scheduler** | Cron-Free Delayed Queue | Precise timestamp scheduling via BullMQ & Redis Sorted Sets | [`emailScheduler.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/services/emailScheduler.ts), [`emailQueue.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/queues/emailQueue.ts) |
| **Scheduler** | Date-Time Presets | Instant calculation for +10m, +1h, tomorrow 9am, or custom date | [`emailRoutes.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/routes/emailRoutes.ts) |
| **Persistence** | Relational Database | PostgreSQL storing `User`, `EmailJob`, and `SlackIntegration` schema | [`schema.prisma`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/prisma/schema.prisma) |
| **Persistence** | Idempotency & Crash Recovery | `jobId` deduplication and Redis AOF recovery across process restarts | [`emailWorker.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/workers/emailWorker.ts) |
| **Rate Limiting** | Per-Sender Hourly Limit | Atomic Redis counter (`ratelimit:{sender}:{YYYY-MM-DD-HH}`) | [`rateLimiter.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/services/rateLimiter.ts) |
| **Rate Limiting** | Next-Hour Rescheduling | Over-limit jobs delayed to next hour window via `job.moveToDelayed` | [`emailWorker.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/workers/emailWorker.ts) |
| **Rate Limiting** | Slack Webhook Alerts | Real-time Slack notifications dispatched when limit is hit | [`slackService.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/services/slackService.ts) |
| **Concurrency** | Parallel Worker Execution | Configurable parallel job worker processing (`WORKER_CONCURRENCY`) | [`emailWorker.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/workers/emailWorker.ts) |
| **Concurrency** | Inter-Email Throttling | Minimum delay between consecutive email dispatches (`DELAY_BETWEEN_EMAILS_MS`) | [`emailWorker.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/workers/emailWorker.ts) |
| **Search Engine** | Elasticsearch Indexing | Full-text search across `subject`, `recipient`, `body`, and `senderEmail` | [`emailIndexer.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/services/emailIndexer.ts) |
| **Email Delivery** | Nodemailer & Ethereal | SMTP dispatch with auto-generated Ethereal test accounts & preview links | [`mailer.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/lib/mailer.ts) |
| **Monitoring** | Bull-Board UI | Live web dashboard for queue stats, active/delayed/completed jobs | [`index.ts`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/backend/src/index.ts) |

---

### Frontend Features

| Category | Feature | Description | Key Modules |
|---|---|---|---|
| **Authentication** | NextAuth.js | Credentials authentication + Google OAuth provider support | [`login/page.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/app/login/page.tsx), [`AuthProvider.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/components/AuthProvider.tsx) |
| **Dashboard** | Overview Metrics | Cards displaying Total Scheduled, Sent, Pending, and Failed jobs | [`(dashboard)/page.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/app/\(dashboard\)/page.tsx) |
| **Dashboard** | Real-Time Status Filter | Filter tabs: All, Scheduled / Pending, Sent, and Failed | [`(dashboard)/page.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/app/\(dashboard\)/page.tsx) |
| **Dashboard** | Elasticsearch Search | Live search bar querying backend Elasticsearch full-text API | [`(dashboard)/page.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/app/\(dashboard\)/page.tsx) |
| **Compose Modal** | Recipient Input & CSV Upload | Manual email tagging or bulk recipient import from `.csv` files | [`ComposeModal.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/components/ComposeModal.tsx) |
| **Compose Modal** | Rich Body Editor Toolbar | Formatting options: Bold, Italic, Lists, Links, Code formatting | [`ComposeModal.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/components/ComposeModal.tsx) |
| **Compose Modal** | Date & Time Preset Picker | Presets ("In 10 min", "In 1 hour", "Tomorrow 9:00 AM", Custom date-time) | [`ComposeModal.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/components/ComposeModal.tsx) |
| **Data Tables** | Interactive Job Table | Detailed table with status badges, recipient list, subject, and time | [`(dashboard)/page.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/app/\(dashboard\)/page.tsx) |
| **Integrations** | Slack Webhook Modal | Config modal for users to set custom Slack alert webhook URLs | [`SlackModal.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/components/SlackModal.tsx) |
| **Navigation** | Quick Monitoring Links | Sidebar link directly opening Bull-Board Redis queue UI | [`Sidebar.tsx`](file:///Users/nausheenali/Desktop/reachinbox-scheduler/frontend/src/components/Sidebar.tsx) |

---

## 📊 Monitoring & Verification

### Essential URLs
- **Next.js Web Application**: `http://localhost:3000`
- **Bull-Board Live Queue Monitor**: `http://localhost:5001/admin/queues`
- **Backend Health Check Endpoint**: `http://localhost:5001/health`
- **Elasticsearch Health Check**: `http://localhost:9200/_cluster/health`

### Automated Load & Rescheduling Test Script
Run the included end-to-end verification script to test rate limiting, job rescheduling, Slack notifications, and idempotency:

```bash
cd backend
npx tsx src/scripts/testLoad.ts
```

---

## 📄 License
ISC License © ReachInbox

