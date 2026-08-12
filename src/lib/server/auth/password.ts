import bcrypt from 'bcryptjs';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith('$2')) {
    return bcrypt.compare(password, passwordHash);
  }

  const crypto = await import('crypto');
  const sha256 = crypto.createHash('sha256').update(password).digest('hex');
  return sha256 === passwordHash;
}
