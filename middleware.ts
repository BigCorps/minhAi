// middleware.ts
// PROTEGE /dashboard e subpastas

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Rotas públicas (não precisam autenticação)
  const publicRoutes = ['/', '/login', '/auth/callback', '/auth/confirm', '/termos', '/aviso'];

  // ✅ MUDANÇA: Proteger /dashboard e todas suas subpastas
  const isProtectedRoute = pathname.startsWith('/dashboard');

  const isPublicRoute = publicRoutes.includes(pathname);

  // Se é rota protegida e usuário NÃO está logado → redirecionar para login
  if (isProtectedRoute && !user) {
    console.log('🔒 Rota protegida sem login:', pathname);
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Se usuário está logado e tenta acessar login → redirecionar para dashboard
  if (user && pathname === '/login') {
    console.log('✅ Usuário logado tentando acessar login, redirecionando para /dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};