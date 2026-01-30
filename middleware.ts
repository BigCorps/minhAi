import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const path = requestUrl.pathname;
  
  console.log('Middleware - Path:', path);

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = [
    '/login',
    '/auth/callback',
    '/ia', // Assistentes públicos
    '/termos',
    '/aviso',
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

  // Rotas protegidas
  const protectedPaths = [
    '/',
    '/assistentes',
    '/funcoes', 
    '/saldo',
    '/historico',
    '/credits',
    '/faqs',
    '/perfil',
    '/pacotes',
  ];

  const isProtectedPath = protectedPaths.some(route => 
    path === route || path.startsWith(route + '/')
  );

  // Se não autenticado e rota protegida → login
  if (!user && isProtectedPath) {
    console.log('Não autenticado, redirecionando para login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se autenticado e tentando acessar login → home
  if (user && path === '/login') {
    console.log('Já autenticado, redirecionando para home');
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};