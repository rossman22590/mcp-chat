import 'server-only';

import { DEFAULT_ADMIN_EMAILS, normalizeEmail } from '@/lib/admin-config';
import { getEffectiveSession } from '@/lib/auth-utils';

export function getAdminEmails() {
  const envAdminEmails =
    process.env.ADMIN_EMAILS?.split(',').map(normalizeEmail) ?? [];

  return Array.from(
    new Set([...DEFAULT_ADMIN_EMAILS.map(normalizeEmail), ...envAdminEmails]),
  ).filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  return getAdminEmails().includes(normalizeEmail(email));
}

export async function requireAdminSession() {
  const session = await getEffectiveSession();

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return null;
  }

  return session;
}
