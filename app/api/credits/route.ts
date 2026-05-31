import { getEffectiveSession, shouldPersistData } from '@/lib/auth-utils';
import { DEFAULT_CREDIT_PLAN, INITIAL_USER_CREDITS } from '@/lib/credits';
import { getUserCreditBalance } from '@/lib/db/queries';

export async function GET() {
  const session = await getEffectiveSession();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!shouldPersistData()) {
    return Response.json(
      {
        credits: INITIAL_USER_CREDITS,
        plan: DEFAULT_CREDIT_PLAN,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const creditBalance = await getUserCreditBalance({
    userId: session.user.id,
  });

  if (!creditBalance) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  return Response.json(creditBalance, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
