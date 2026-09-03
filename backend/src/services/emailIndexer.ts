import { esClient, EMAILS_INDEX } from "../lib/elasticsearch";
import { EmailJob } from "@prisma/client";

/**
 * Indexes or updates an EmailJob document in the Elasticsearch 'emails' index.
 * Fields indexed: recipient, subject, body, status, scheduledAt, sentAt, senderEmail, userId, createdAt.
 */
export async function indexEmailJob(job: Partial<EmailJob> & { id: string }): Promise<void> {
  try {
    const doc: Record<string, any> = {
      id: job.id,
    };

    if (job.recipient !== undefined) doc.recipient = job.recipient;
    if (job.subject !== undefined) doc.subject = job.subject;
    if (job.body !== undefined) doc.body = job.body;
    if (job.status !== undefined) doc.status = job.status;
    if (job.scheduledAt !== undefined) doc.scheduledAt = job.scheduledAt ? new Date(job.scheduledAt).toISOString() : null;
    if (job.sentAt !== undefined) doc.sentAt = job.sentAt ? new Date(job.sentAt).toISOString() : null;
    if (job.senderEmail !== undefined) doc.senderEmail = job.senderEmail;
    if (job.userId !== undefined) doc.userId = job.userId;
    if (job.createdAt !== undefined) doc.createdAt = job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString();

    await esClient.update({
      index: EMAILS_INDEX,
      id: job.id,
      doc,
      doc_as_upsert: true,
    });

    // Refresh index so search queries immediately see new documents
    await esClient.indices.refresh({ index: EMAILS_INDEX });

    console.log(`[EmailIndexer] Indexed and refreshed EmailJob ${job.id} in Elasticsearch '${EMAILS_INDEX}'`);
  } catch (error: any) {
    console.warn(`[EmailIndexer] Note: Elasticsearch indexing note for ${job.id}: ${error.message}`);
  }
}

/**
 * Performs a multi-match full-text search against the Elasticsearch 'emails' index on subject, recipient, and body.
 */
export async function searchEmailsInES(query: string): Promise<any[]> {
  try {
    const response = await esClient.search({
      index: EMAILS_INDEX,
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query,
                fields: ["subject^2", "recipient^2", "body", "senderEmail"],
                fuzziness: "AUTO",
              },
            },
            {
              wildcard: {
                subject: {
                  value: `*${query.toLowerCase()}*`,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                recipient: {
                  value: `*${query.toLowerCase()}*`,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                body: {
                  value: `*${query.toLowerCase()}*`,
                  case_insensitive: true,
                },
              },
            },
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => ({
      _score: hit._score,
      ...(hit._source as object),
    }));
  } catch (error: any) {
    console.warn(`[EmailIndexer] Search in Elasticsearch fallback/unavailable: ${error.message}`);
    return [];
  }
}
