import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  console.log('Auth callback - code:', code ? 'presente' : 'ausente');

  if (code) {
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              console.error('Erro ao setar cookie:', error);
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              console.error('Erro ao remover cookie:', error);
            }
          },
        },
      }
    );

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Erro no exchangeCodeForSession:', error);
        return NextResponse.redirect(new URL('/login?error=auth_error', requestUrl.origin));
      }

      console.log('Auth bem-sucedida para user:', data.user?.email);
      
      // Redirecionar para dashboard
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    } catch (error) {
      console.error('Exceção no auth callback:', error);
      return NextResponse.redirect(new URL('/login?error=callback_exception', requestUrl.origin));
    }
  }

  // Se não tiver code, redirecionar para login
  console.log('Sem code no callback, redirecionando para login');
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
