import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = createClient();

  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('[platform-admin] Falha ao encerrar sessão:', error);
  }

  const loginPath =
    requestUrl.hostname.toLowerCase() === 'admin.minhai.app'
      ? '/login'
      : '/admin/login';

  return NextResponse.redirect(new URL(loginPath, requestUrl.origin));
}
