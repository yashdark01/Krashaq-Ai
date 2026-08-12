import { getConfig } from '@/lib/server/config';

const BRAND = {
  primary: '#10b981',
  background: '#0a0a0b',
  text: '#fafafa',
  muted: '#a1a1aa',
};

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:${BRAND.background};font-family:system-ui,sans-serif;color:${BRAND.text}">
  <div style="max-width:560px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.primary}">Krashaq</p>
    <h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
    ${body}
    <p style="margin:24px 0 0;font-size:12px;color:${BRAND.muted}">© Krashaq · AI agritech for Indian farmers</p>
  </div>
</body>
</html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:${BRAND.primary};color:#052e1f;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${label}</a></p>`;
}

export function welcomeEmail(name: string) {
  const subject = 'Welcome to Krashaq';
  const html = layout(
    'Welcome to Krashaq',
    `<p style="color:${BRAND.muted};line-height:1.6">Hi ${name},</p>
     <p style="color:${BRAND.muted};line-height:1.6">Your account is ready. Get weather alerts, crop advice, and chat with Krashaq AI from your dashboard.</p>`
  );
  return { subject, html, text: `Welcome to Krashaq, ${name}!` };
}

export function verifyEmail(name: string, token: string) {
  const { appUrl } = getConfig();
  const link = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Verify your Krashaq email';
  const html = layout(
    'Verify your email',
    `<p style="color:${BRAND.muted};line-height:1.6">Hi ${name}, please confirm your email address.</p>
     ${button(link, 'Verify email')}
     <p style="color:${BRAND.muted};font-size:13px;line-height:1.6">Or copy this link: ${link}</p>`
  );
  return { subject, html, text: `Verify your email: ${link}` };
}

export function resetPasswordEmail(name: string, token: string) {
  const { appUrl } = getConfig();
  const link = `${appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Reset your Krashaq password';
  const html = layout(
    'Reset your password',
    `<p style="color:${BRAND.muted};line-height:1.6">Hi ${name}, we received a password reset request.</p>
     ${button(link, 'Reset password')}
     <p style="color:${BRAND.muted};font-size:13px;line-height:1.6">This link expires in 1 hour. If you did not request this, ignore this email.</p>`
  );
  return { subject, html, text: `Reset password: ${link}` };
}

export function passwordChangedEmail(name: string) {
  const subject = 'Your Krashaq password was changed';
  const html = layout(
    'Password changed',
    `<p style="color:${BRAND.muted};line-height:1.6">Hi ${name}, your password was updated successfully. If this wasn't you, contact support immediately.</p>`
  );
  return { subject, html, text: `Hi ${name}, your Krashaq password was changed.` };
}

export function farmerLinkedEmail(farmerName: string, supplierName: string) {
  const subject = 'You have been linked to a supplier on Krashaq';
  const html = layout(
    'Supplier linked',
    `<p style="color:${BRAND.muted};line-height:1.6">Hi ${farmerName}, <strong>${supplierName}</strong> is now your supplier on Krashaq.</p>`
  );
  return { subject, html, text: `${supplierName} is now your supplier on Krashaq.` };
}

export function supplierWelcomeEmail(name: string, email: string, temporaryPassword: string) {
  const { appUrl } = getConfig();
  const subject = 'Your Krashaq supplier account is ready';
  const html = layout(
    'Welcome, Krashaq partner',
    `<p style="color:${BRAND.muted};line-height:1.6">Hi ${name},</p>
     <p style="color:${BRAND.muted};line-height:1.6">Your supplier license is active. Use these credentials to log in and manage your farmers:</p>
     <p style="color:${BRAND.text};line-height:1.6;margin:16px 0;padding:12px;background:#27272a;border-radius:8px;font-family:monospace;font-size:14px">
       Email: ${email}<br/>Password: ${temporaryPassword}
     </p>
     <p style="color:${BRAND.muted};font-size:13px;line-height:1.6">Change your password after first login in Settings.</p>
     ${button(`${appUrl}/auth/login`, 'Log in to Krashaq')}`
  );
  return {
    subject,
    html,
    text: `Welcome ${name}. Login at ${appUrl}/auth/login with ${email}`,
  };
}
