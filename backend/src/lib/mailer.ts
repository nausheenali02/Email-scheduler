import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

let cachedTransporter: Transporter | null = null;

/**
 * Returns a configured Nodemailer Transporter.
 * Auto-creates an Ethereal test account if SMTP credentials are not in environment.
 */
export async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;

  if (host && user && pass) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return cachedTransporter;
  }

  // Fallback: Create Ethereal SMTP test account automatically
  console.log("[Mailer] No custom SMTP found in env. Creating Ethereal test account...");
  const testAccount = await nodemailer.createTestAccount();
  console.log(`[Mailer] Ethereal Test Account Created: ${testAccount.user}`);

  cachedTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return cachedTransporter;
}
