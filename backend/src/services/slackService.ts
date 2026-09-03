import { prisma } from "../lib/prisma";

/**
 * Queries SlackIntegration for the user/tenant and sends a real Slack alert
 * to their webhookUrl notifying them that the hourly rate limit was reached.
 * If not connected, gracefully skips without throwing errors.
 */
export async function sendSlackRateLimitAlert(
  userId: string,
  senderEmail: string,
  currentCount: number,
  maxLimit: number
): Promise<void> {
  try {
    const slackIntegration = await prisma.slackIntegration.findFirst({
      where: { userId },
    });

    if (!slackIntegration || !slackIntegration.webhookUrl) {
      console.log(
        `[SlackAlert] No Slack webhook integration configured for userId ${userId}. Skipping alert.`
      );
      return;
    }

    const payload = {
      text: `⚠️ *Email Rate Limit Exceeded*\nSender \`${senderEmail}\` reached hourly rate limit of *${maxLimit}* emails (${currentCount} attempted). Pending email jobs are automatically delayed until the next hour window.`,
      channel: slackIntegration.channel || undefined,
    };

    const response = await fetch(slackIntegration.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(
        `[SlackAlert] Rate limit alert posted to Slack webhook for userId ${userId}`
      );
    } else {
      console.warn(
        `[SlackAlert] Slack webhook HTTP status ${response.status}`
      );
    }
  } catch (error) {
    console.error("[SlackAlert] Gracefully handled error while sending Slack alert:", error);
  }
}
