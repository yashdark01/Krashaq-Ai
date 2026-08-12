import { createHash, randomBytes } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import { hashPassword } from '@/lib/server/auth/password';
import { AuthError } from '@/lib/server/services/auth-service';
import { sendTransactionalEmail } from '@/lib/server/services/notification-service';
import {
  passwordChangedEmail,
  resetPasswordEmail,
  verifyEmail,
  welcomeEmail,
} from '@/lib/server/email/templates';
import { getUserFromAuthHeader } from '@/lib/server/services/auth-service';

const TOKEN_BYTES = 32;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken() {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export async function sendSignupEmails(userId: string, name: string, email: string) {
  const token = generateToken();
  const users = await getCollection('users');
  await users.updateOne(
    { _id: userId } as never,
    {
      $set: {
        email_verification_token: hashToken(token),
        email_verification_expires_at: new Date(Date.now() + VERIFY_TTL_MS),
        updated_at: new Date(),
      },
    } as never
  );

  const welcome = welcomeEmail(name);
  await sendTransactionalEmail(email, welcome.subject, welcome.html, 'welcome', welcome.text);

  const verify = verifyEmail(name, token);
  await sendTransactionalEmail(email, verify.subject, verify.html, 'verify-email', verify.text);
}

export async function verifyEmailToken(token: string) {
  if (!token) throw new AuthError('Verification token is required', 'INVALID_TOKEN', 400);

  const users = await getCollection('users');
  const user = await users.findOne({
    email_verification_token: hashToken(token),
    email_verification_expires_at: { $gt: new Date() },
  } as never);

  if (!user) throw new AuthError('Invalid or expired verification token', 'INVALID_TOKEN', 400);

  await users.updateOne(
    { _id: user._id } as never,
    {
      $set: {
        email_verified: true,
        updated_at: new Date(),
      },
      $unset: {
        email_verification_token: '',
        email_verification_expires_at: '',
      },
    } as never
  );

  return { verified: true, email: user.email as string };
}

export async function resendVerificationEmail(email: string) {
  const users = await getCollection('users');
  const normalized = email.toLowerCase().trim();
  const user = await users.findOne({ email: normalized });
  if (!user) {
    return { sent: true, message: 'If the email exists, a verification link was sent' };
  }
  if (user.email_verified) {
    throw new AuthError('Email is already verified', 'ALREADY_VERIFIED', 400);
  }

  const token = generateToken();
  await users.updateOne(
    { _id: user._id } as never,
    {
      $set: {
        email_verification_token: hashToken(token),
        email_verification_expires_at: new Date(Date.now() + VERIFY_TTL_MS),
        updated_at: new Date(),
      },
    } as never
  );

  const mail = verifyEmail(user.name as string, token);
  await sendTransactionalEmail(
    normalized,
    mail.subject,
    mail.html,
    'verify-email',
    mail.text
  );

  return { sent: true, message: 'If the email exists, a verification link was sent' };
}

export async function requestPasswordReset(email: string) {
  const users = await getCollection('users');
  const normalized = email.toLowerCase().trim();
  const user = await users.findOne({ email: normalized });

  if (user) {
    const token = generateToken();
    await users.updateOne(
      { _id: user._id } as never,
      {
        $set: {
          password_reset_token: hashToken(token),
          password_reset_expires_at: new Date(Date.now() + RESET_TTL_MS),
          updated_at: new Date(),
        },
      } as never
    );

    const mail = resetPasswordEmail(user.name as string, token);
    await sendTransactionalEmail(
      normalized,
      mail.subject,
      mail.html,
      'reset-password',
      mail.text
    );
  }

  return { sent: true, message: 'If the email exists, a reset link was sent' };
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  if (!token) throw new AuthError('Reset token is required', 'INVALID_TOKEN', 400);

  const users = await getCollection('users');
  const user = await users.findOne({
    password_reset_token: hashToken(token),
    password_reset_expires_at: { $gt: new Date() },
  } as never);

  if (!user) throw new AuthError('Invalid or expired reset token', 'INVALID_TOKEN', 400);

  const passwordHash = await hashPassword(newPassword);
  await users.updateOne(
    { _id: user._id } as never,
    {
      $set: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
      $unset: {
        password_reset_token: '',
        password_reset_expires_at: '',
      },
    } as never
  );

  const mail = passwordChangedEmail(user.name as string);
  await sendTransactionalEmail(
    user.email as string,
    mail.subject,
    mail.html,
    'password-changed',
    mail.text
  );

  return { reset: true };
}

export async function resendVerificationForAuthUser(authHeader: string | null) {
  const user = await getUserFromAuthHeader(authHeader);
  if (!user) throw new AuthError('Unauthorized', 'UNAUTHORIZED', 401);
  return resendVerificationEmail(user.email);
}
