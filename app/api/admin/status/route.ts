import { isAdminEmail } from '@/lib/admin';
import { getEffectiveSession } from '@/lib/auth-utils';

export async function GET() {
  const session = await getEffectiveSession();

  return Response.json(
    {
      isAdmin: isAdminEmail(session?.user?.email),
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
