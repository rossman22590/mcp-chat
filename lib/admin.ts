import 'server-only';

import { DEFAULT_ADMIN_EMAILS, normalizeEmail } from '@/lib/admin-config';
import { getEffectiveSession, shouldPersistData } from '@/lib/auth-utils';
import { getUserAdminAccess } from '@/lib/db/queries';

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

  if (!session?.user?.email) {
    return null;
  }

  if (isAdminEmail(session.user.email)) {
    return session;
  }

  if (!session.user.id || !shouldPersistData()) {
    return null;
  }

  const adminAccess = await getUserAdminAccess({ userId: session.user.id });

  if (!adminAccess?.isAdmin || adminAccess.isSuspended) {
    return null;
  }

  return session;
}
