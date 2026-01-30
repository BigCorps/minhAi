// app/auth/callback/route.ts
// Callback OAuth que redireciona para raiz "/" (dashboard)

import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/'; // Redireciona para raiz (dashboard)

  if (code) {
    try {
      // Next.js 16+ - cookies é async
      const cookieStore = await cookies();
      const supabase = createClient();

      // Trocar code por session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('❌ Erro ao trocar code por session:', error);
        return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin));
      }

      if (data.session) {
        console.log('✅ Sessão criada:', data.session.user.email);
        
        // Redirecionar para raiz (dashboard)
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    } catch (error) {
      console.error('❌ Erro no callback:', error);
      return NextResponse.redirect(new URL('/login?error=callback_error', requestUrl.origin));
    }
  }

  console.warn('⚠️ Callback sem code');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}