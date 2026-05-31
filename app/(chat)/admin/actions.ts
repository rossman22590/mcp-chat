'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdminSession } from '@/lib/admin';
import { CREDIT_PLANS } from '@/lib/credits';
import { updateUserAdminSettings } from '@/lib/db/admin-queries';

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(CREDIT_PLANS),
  credits: z.coerce.number().int().min(0).max(1_000_000),
  isSuspended: z.boolean(),
  isAdmin: z.boolean(),
  creditChangeType: z.enum(['grant', 'refund']),
  reason: z.string().trim().max(500).optional(),
});

export async function updateUserAdminAction(formData: FormData) {
  const adminSession = await requireAdminSession();

  if (!adminSession) {
    throw new Error('Unauthorized');
  }

  const adminEmail = adminSession.user?.email;

  if (!adminEmail) {
    throw new Error('Unauthorized');
  }

  const parsed = updateUserSchema.safeParse({
    userId: formData.get('userId'),
    plan: formData.get('plan'),
    credits: formData.get('credits'),
    isSuspended: formData.get('isSuspended') === 'on',
    isAdmin: formData.get('isAdmin') === 'on',
    creditChangeType: formData.get('creditChangeType') ?? 'grant',
    reason: formData.get('reason')?.toString() || undefined,
  });

  if (!parsed.success) {
    throw new Error('Invalid user update');
  }

  await updateUserAdminSettings({
    targetUserId: parsed.data.userId,
    plan: parsed.data.plan,
    credits: parsed.data.credits,
    isSuspended: parsed.data.isSuspended,
    isAdmin: parsed.data.isAdmin,
    creditChangeType: parsed.data.creditChangeType,
    reason: parsed.data.reason,
    admin: {
      userId: adminSession.user?.id,
      email: adminEmail,
    },
  });

  revalidatePath('/admin');
}
