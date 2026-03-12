// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rotas que exigem has_active_plan = true
const PLAN_PROTECTED_ROUTES = [
  '/dashboard/google',       // Serviços Google
  '/dashboard/meta',         // Serviços Meta
  '/dashboard/producao',     // Linha de Produção
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
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

  const publicRoutes = ['/', '/login', '/auth/callback', '/auth/confirm', '/termos', '/aviso'];
  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isPublicRoute = publicRoutes.includes(pathname);

  // 1. Sem login → redireciona para /login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Logado tentando acessar /login → redireciona para /dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Rotas que exigem plano ativo
  const requiresPlan = PLAN_PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  if (requiresPlan && user) {
    const { data: credits } = await supabase
      .from('user_credits')
      .select('has_active_plan, plan_expires_at')
      .eq('user_id', user.id)
      .single();

    const hasActivePlan =
      credits?.has_active_plan === true &&
      credits?.plan_expires_at != null &&
      new Date(credits.plan_expires_at) > new Date();

    if (!hasActivePlan) {
      // Redireciona para créditos com aviso de que precisa de um plano
      const redirectUrl = new URL('/dashboard/credits', request.url);
      redirectUrl.searchParams.set('requires_plan', '1');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
