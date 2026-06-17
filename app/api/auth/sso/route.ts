import { NextRequest, NextResponse } from 'next/server';

import { signIn } from '@/app/(auth)/auth';
import { validateAitutorSsoToken } from '@/lib/aitutor-sso';

const ALLOWED_LOCALHOST_PORTS = ['3000', '3001'];

const isAllowedOrigin = (referer: string | null): boolean => {
  // Allow if referer is missing or stripped (e.g. window.open with noopener)
  if (!referer) return true;

  try {
    const url = new URL(referer);
    const hostname = url.hostname;
    const port = url.port;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return ALLOWED_LOCALHOST_PORTS.includes(port);
    }

    if (hostname === 'myapps.ai' || hostname.endsWith('.myapps.ai')) {
      return true;
    }

    // AiTutor wrapper deployments on Vercel
    if (hostname.endsWith('.vercel.app')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

export async function GET(request: NextRequest) {
  const referer = request.headers.get('referer');
  if (!isAllowedOrigin(referer)) {
    console.warn(`[SSO] Rejected: invalid referer: ${referer}`);
    return NextResponse.json({ error: 'Access denied: invalid origin' }, { status: 403 });
  }

  const ssoToken = request.nextUrl.searchParams.get('sso_token');
  if (!ssoToken) {
    return NextResponse.json({ error: 'Missing sso_token parameter' }, { status: 400 });
  }

  const validation = await validateAitutorSsoToken(ssoToken);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const redirectTo = request.nextUrl.searchParams.get('next') || '/';

  console.log(`[SSO] User ${validation.user.email} logging in via SSO from ${referer ?? 'no referer'}`);

  // Let NextAuth create the session cookie with the correct production salt/name.
  return signIn('aitutor-sso', { sso_token: ssoToken, redirectTo });
}
