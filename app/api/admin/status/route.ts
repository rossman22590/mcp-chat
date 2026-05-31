import { requireAdminSession } from '@/lib/admin';

export async function GET() {
  const session = await requireAdminSession();

  return Response.json(
    {
      isAdmin: Boolean(session),
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
