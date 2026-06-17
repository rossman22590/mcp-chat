import 'server-only';

import crypto from 'crypto';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/queries';
import { user, type User } from '@/lib/db/schema';

const SSO_TOKEN_MAX_AGE_SECONDS = 300;

export type AitutorSsoValidationResult =
  | { ok: true; user: User }
  | { ok: false; error: string; status: number };

export const validateAitutorSsoToken = async (
  ssoToken: string,
): Promise<AitutorSsoValidationResult> => {
  const parts = ssoToken.split('.');
  if (parts.length !== 2) {
    return { ok: false, error: 'Invalid SSO token format', status: 400 };
  }

  const [subject, signature] = parts;
  const subParts = subject.split(':');
  if (subParts.length !== 2) {
    return { ok: false, error: 'Invalid SSO token subject', status: 400 };
  }

  const [userId, issuedAtStr] = subParts;
  const issuedAt = parseInt(issuedAtStr, 10);
  if (!userId || Number.isNaN(issuedAt)) {
    return { ok: false, error: 'Invalid SSO token parameters', status: 400 };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - issuedAt) > SSO_TOKEN_MAX_AGE_SECONDS) {
    return { ok: false, error: 'SSO token expired', status: 401 };
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return { ok: false, error: 'AUTH_SECRET is not configured', status: 500 };
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(subject)
    .digest('hex');

  if (signature !== expectedSignature) {
    return { ok: false, error: 'Invalid SSO token signature', status: 401 };
  }

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!dbUser) {
    return { ok: false, error: 'User not found', status: 404 };
  }

  return { ok: true, user: dbUser };
};
