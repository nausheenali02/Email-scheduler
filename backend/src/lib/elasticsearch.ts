import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config();

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || "http://localhost:9200";

export const esClient = new Client({
  node: ELASTICSEARCH_URL,
  headers: {
    accept: "application/json",
    "content-type": "application/json",
  },
});

export const EMAILS_INDEX = "emails";

/**
 * Ensures the 'emails' index exists with field mappings in Elasticsearch.
 * Fails open gracefully if cluster is not reachable.
 */
export async function ensureEmailIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAILS_INDEX });
    if (!exists) {
      console.log(`[Elasticsearch] Creating index '${EMAILS_INDEX}'...`);
      await esClient.indices.create({
        index: EMAILS_INDEX,
        mappings: {
          properties: {
            id: { type: "keyword" },
            recipient: { type: "text", fields: { keyword: { type: "keyword" } } },
            subject: { type: "text" },
            body: { type: "text" },
            status: { type: "keyword" },
            scheduledAt: { type: "date" },
            sentAt: { type: "date" },
            senderEmail: { type: "keyword" },
            userId: { type: "keyword" },
            createdAt: { type: "date" },
          },
        },
      });
      console.log(`[Elasticsearch] Index '${EMAILS_INDEX}' created successfully.`);
    }
  } catch (error: any) {
    console.warn(`[Elasticsearch] Index setup note: ${error.message}`);
  }
}
