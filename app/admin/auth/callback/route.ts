import { NextResponse } from 'next/server';

import { checkPlatformAdminUser } from '@/lib/platform-admin';
import { createClient } from '@/lib/supabase-server';

function adminHome(requestUrl: URL) {
  return requestUrl.hostname.toLowerCase() === 'admin.minhai.app'
    ? new URL('/', requestUrl.origin)
    : new URL('/admin', requestUrl.origin);
}

function adminLogin(requestUrl: URL, error?: string) {
  const path =
    requestUrl.hostname.toLowerCase() === 'admin.minhai.app'
      ? '/login'
      : '/admin/login';

  const url = new URL(path, requestUrl.origin);
  if (error) url.searchParams.set('error', error);
  return url;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(adminLogin(requestUrl, 'callback_error'));
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session?.user) {
      console.error('[platform-admin] Falha ao trocar code por sessão:', error);
      return NextResponse.redirect(adminLogin(requestUrl, 'auth_error'));
    }

    const access = await checkPlatformAdminUser(data.session.user);

    if (!access.ok) {
      // A sessão criada no domínio administrativo não deve permanecer ativa
      // quando a conta não está autorizada.
      await supabase.auth.signOut();

      return NextResponse.redirect(
        adminLogin(requestUrl, access.reason),
      );
    }

    return NextResponse.redirect(adminHome(requestUrl));
  } catch (error) {
    console.error('[platform-admin] Erro no callback administrativo:', error);
    return NextResponse.redirect(adminLogin(requestUrl, 'callback_error'));
  }
}
