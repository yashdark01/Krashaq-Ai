import { randomBytes, createHash } from 'crypto';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import { getCollection } from '@/lib/server/db/mongodb';
import { hashPassword, verifyPassword } from '@/lib/server/auth/password';
import { createAccessToken } from '@/lib/server/auth/jwt';
import { createRefreshSession } from '@/lib/server/auth/session-service';
import { serializeUser, AuthError } from '@/lib/server/services/auth-service';
import type { SessionMeta } from '@/lib/server/auth/session-service';
import { createMfaToken, verifyMfaToken } from '@/lib/server/auth/jwt';

const APP_NAME = 'Krashaq';

function hashBackupCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function generateBackupCodes(count = 10) {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-')
  );
}

export async function startMfaSetup(userId: string) {
  const users = await getCollection('users');
  const user = await users.findOne({ _id: userId } as never);
  if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);

  const secret = generateSecret();
  const otpauth = generateURI({
    issuer: APP_NAME,
    label: user.email as string,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  await users.updateOne(
    { _id: userId } as never,
    {
      $set: {
        two_factor_pending_secret: secret,
        updated_at: new Date(),
      },
    } as never
  );

  return { secret, qrCodeDataUrl, manualEntryKey: secret };
}

export async function confirmMfaSetup(userId: string, code: string) {
  const users = await getCollection('users');
  const user = await users.findOne({ _id: userId } as never);
  if (!user?.two_factor_pending_secret) {
    throw new AuthError('MFA setup not started', 'MFA_SETUP_REQUIRED', 400);
  }

  const secret = user.two_factor_pending_secret as string;
  const valid = verifySync({ token: code, secret }).valid;
  if (!valid) throw new AuthError('Invalid verification code', 'INVALID_MFA_CODE', 400);

  const backupCodes = generateBackupCodes();
  const hashed = backupCodes.map(hashBackupCode);

  await users.updateOne(
    { _id: userId } as never,
    {
      $set: {
        two_factor_enabled: true,
        two_factor_secret: secret,
        two_factor_backup_codes: hashed,
        updated_at: new Date(),
      },
      $unset: { two_factor_pending_secret: '' },
    } as never
  );

  return { backup_codes: backupCodes };
}

export async function disableMfa(userId: string, password: string, code: string) {
  const users = await getCollection('users');
  const user = await users.findOne({ _id: userId } as never);
  if (!user?.password_hash) throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS', 401);

  const pwOk = await verifyPassword(password, user.password_hash as string);
  if (!pwOk) throw new AuthError('Invalid password', 'INVALID_PASSWORD', 401);

  if (!user.two_factor_secret) throw new AuthError('MFA not enabled', 'MFA_NOT_ENABLED', 400);

  const valid = verifySync({ token: code, secret: user.two_factor_secret as string }).valid;
  if (!valid) throw new AuthError('Invalid verification code', 'INVALID_MFA_CODE', 400);

  await users.updateOne(
    { _id: userId } as never,
    {
      $set: { two_factor_enabled: false, updated_at: new Date() },
      $unset: {
        two_factor_secret: '',
        two_factor_backup_codes: '',
        two_factor_pending_secret: '',
      },
    } as never
  );

  return { disabled: true };
}

export async function createMfaChallenge(userId: string) {
  const mfa_token = await createMfaToken(userId);
  return { requires_2fa: true, mfa_token };
}

export async function verifyMfaLogin(
  mfaToken: string,
  code: string,
  meta?: SessionMeta
) {
  const payload = await verifyMfaToken(mfaToken);
  if (!payload?.sub) throw new AuthError('Invalid MFA session', 'INVALID_MFA_TOKEN', 401);

  const userId = String(payload.sub);
  const users = await getCollection('users');
  const user = await users.findOne({ _id: userId } as never);
  if (!user?.two_factor_enabled || !user.two_factor_secret) {
    throw new AuthError('MFA not enabled', 'MFA_NOT_ENABLED', 400);
  }

  let verified = verifySync({
    token: code.replace(/\s/g, ''),
    secret: user.two_factor_secret as string,
  }).valid;

  if (!verified && user.two_factor_backup_codes) {
    const hashed = hashBackupCode(code.replace(/\s/g, '').toUpperCase());
    const codes = user.two_factor_backup_codes as string[];
    const idx = codes.indexOf(hashed);
    if (idx >= 0) {
      verified = true;
      codes.splice(idx, 1);
      await users.updateOne(
        { _id: userId } as never,
        { $set: { two_factor_backup_codes: codes, updated_at: new Date() } } as never
      );
    }
  }

  if (!verified) throw new AuthError('Invalid verification code', 'INVALID_MFA_CODE', 401);

  if (user.is_active === false) {
    throw new AuthError('Account is deactivated', 'ACCOUNT_INACTIVE', 403);
  }

  const { normalizeRole, isSupplierRole, isFarmerRole } = await import('@/lib/auth/roles');
  const { assertSupplierLicenseAllowsLogin } = await import(
    '@/lib/server/services/supplier-license-service'
  );
  const { assertFarmerSubscriptionAllowsLogin } = await import(
    '@/lib/server/services/farmer-subscription-service'
  );
  const role = normalizeRole(user.role as string);
  if (isSupplierRole(role)) {
    await assertSupplierLicenseAllowsLogin(userId);
  }
  if (isFarmerRole(role)) {
    const supplierId = user.supplier_id ? String(user.supplier_id) : null;
    await assertFarmerSubscriptionAllowsLogin(userId, supplierId);
  }

  const session = await createRefreshSession(userId, meta);
  const accessToken = await createAccessToken({
    sub: userId,
    email: user.email,
    role: user.role ?? 'farmer',
    sid: session.sessionId,
  });

  return {
    access_token: accessToken,
    refresh_token: session.refreshToken,
    session_id: session.sessionId,
    user: serializeUser(user as Record<string, unknown>),
    requires_2fa: false,
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const users = await getCollection('users');
  const user = await users.findOne({ _id: userId } as never);
  if (!user?.password_hash) throw new AuthError('User not found', 'USER_NOT_FOUND', 404);

  const valid = await verifyPassword(currentPassword, user.password_hash as string);
  if (!valid) throw new AuthError('Current password is incorrect', 'INVALID_PASSWORD', 401);

  const passwordHash = await hashPassword(newPassword);
  await users.updateOne(
    { _id: userId } as never,
    { $set: { password_hash: passwordHash, updated_at: new Date() } } as never
  );

  return { changed: true };
}

export async function getBackupCodesRemaining(userId: string) {
  const users = await getCollection('users');
  const user = await users.findOne({ _id: userId } as never);
  if (!user?.two_factor_enabled) {
    throw new AuthError('MFA not enabled', 'MFA_NOT_ENABLED', 400);
  }
  const codes = (user.two_factor_backup_codes as string[]) ?? [];
  return { remaining: codes.length };
}

export async function regenerateBackupCodes(userId: string, password: string, code: string) {
  const users = await getCollection('users');
  const user = await users.findOne({ _id: userId } as never);
  if (!user?.password_hash) throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS', 401);

  const pwOk = await verifyPassword(password, user.password_hash as string);
  if (!pwOk) throw new AuthError('Invalid password', 'INVALID_PASSWORD', 401);

  if (!user.two_factor_secret) throw new AuthError('MFA not enabled', 'MFA_NOT_ENABLED', 400);

  const valid = verifySync({ token: code, secret: user.two_factor_secret as string }).valid;
  if (!valid) throw new AuthError('Invalid verification code', 'INVALID_MFA_CODE', 400);

  const backupCodes = generateBackupCodes();
  const hashed = backupCodes.map(hashBackupCode);

  await users.updateOne(
    { _id: userId } as never,
    { $set: { two_factor_backup_codes: hashed, updated_at: new Date() } } as never
  );

  return { backup_codes: backupCodes };
}
