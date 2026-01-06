import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      // Troca o código por sessão
      await supabase.auth.exchangeCodeForSession(code);
      
      // Pequeno delay para garantir que a sessão foi estabelecida
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Error exchanging code for session:', error);
      // Se der erro, redireciona para login com mensagem
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }
  }

  // Redireciona para dashboard
  return NextResponse.redirect(`${origin}/dashboard`);
}