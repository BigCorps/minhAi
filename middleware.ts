import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const path = requestUrl.pathname;

  console.log('Middleware - Path:', path);

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = [
    '/',
    '/login',
    '/auth/callback',
    '/oi', // Assistentes públicos
  ];

  // Verificar se é rota pública
  const isPublicRoute = publicRoutes.some(route => 
    path === route || path.startsWith(route + '/')
  );

  // Se for rota pública, permitir acesso
  if (isPublicRoute) {
    console.log('Rota pública, permitindo acesso');
    return NextResponse.next();
  }

  // Para rotas protegidas, verificar autenticação
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
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('User:', user ? user.email : 'não autenticado');

  // Se não estiver autenticado e tentar acessar rota protegida
  if (!user && path.startsWith('/dashboard')) {
    console.log('Não autenticado, redirecionando para login');
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Se estiver autenticado e tentar acessar /login, redirecionar para dashboard
  if (user && path === '/login') {
    console.log('Já autenticado, redirecionando para dashboard');
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
