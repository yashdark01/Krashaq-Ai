import { getCollection } from '@/lib/server/db/mongodb';
import { sendMail } from '@/lib/server/email/mailer';

export type EmailTemplate =
  | 'welcome'
  | 'verify-email'
  | 'reset-password'
  | 'password-changed'
  | 'farmer-linked'
  | 'mfa-enabled'
  | 'new-login';

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string,
  template: EmailTemplate,
  text?: string
) {
  const result = await sendMail({ to, subject, html, text });

  try {
    const emailLogs = await getCollection('email_logs');
    await emailLogs.insertOne({
      to,
      subject,
      template,
      message_id: result.messageId,
      dev_mode: result.devMode,
      created_at: new Date(),
    } as never);
  } catch (error) {
    console.warn('Failed to log email:', error);
  }

  return result;
}
