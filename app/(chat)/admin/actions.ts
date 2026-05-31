'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdminSession } from '@/lib/admin';
import { CREDIT_PLANS } from '@/lib/credits';
import { updateUserPlanAndCredits } from '@/lib/db/queries';

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(CREDIT_PLANS),
  credits: z.coerce.number().int().min(0).max(1_000_000),
});

export async function updateUserAdminAction(formData: FormData) {
  const adminSession = await requireAdminSession();

  if (!adminSession) {
    throw new Error('Unauthorized');
  }

  const parsed = updateUserSchema.safeParse({
    userId: formData.get('userId'),
    plan: formData.get('plan'),
    credits: formData.get('credits'),
  });

  if (!parsed.success) {
    throw new Error('Invalid user update');
  }

  await updateUserPlanAndCredits(parsed.data);
  revalidatePath('/admin');
}
