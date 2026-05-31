import { getEffectiveSession, shouldPersistData } from '@/lib/auth-utils';
import { getUserCreditTransactions } from '@/lib/db/queries';

export async function GET() {
  const session = await getEffectiveSession();

  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!shouldPersistData()) {
    return Response.json(
      {
        transactions: [],
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const transactions = await getUserCreditTransactions({
    userId: session.user.id,
  });

  return Response.json(
    {
      transactions,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
