export const DEFAULT_ADMIN_EMAILS = ['rcohen@mytsi.org'] as const;

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? '';
}

export function isDefaultAdminEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  return DEFAULT_ADMIN_EMAILS.some(
    (adminEmail) => normalizeEmail(adminEmail) === normalizedEmail,
  );
}
