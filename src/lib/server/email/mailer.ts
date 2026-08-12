import nodemailer from 'nodemailer';
import { getConfig } from '@/lib/server/config';

export function isSmtpConfigured() {
  const { smtpHost, smtpUser, smtpPass } = getConfig();
  return Boolean(smtpHost && smtpUser && smtpPass);
}

function createTransport() {
  const { smtpHost, smtpPort, smtpUser, smtpPass } = getConfig();
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const { smtpFrom } = getConfig();

  if (!isSmtpConfigured()) {
    console.info('[email:dev]', {
      to: options.to,
      subject: options.subject,
      preview: options.text ?? options.html.slice(0, 200),
    });
    return { messageId: `dev-${Date.now()}`, devMode: true };
  }

  const transport = createTransport();
  const result = await transport.sendMail({
    from: smtpFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return { messageId: result.messageId, devMode: false };
}
