// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PLAN_PROTECTED_ROUTES = [
  '/dashboard/agenda',
  '/dashboard/atendimentos',
  '/dashboard/producao',
];

// Subdomínios reservados — nunca tratar como slug de cliente
const RESERVED_SUBDOMAINS = [
  // Infraestrutura
  'www', 'app', 'api', 'admin', 'mail', 'smtp',
  // Rotas do sistema (evita subdomínio que colide com rota)
  'dashboard', 'login', 'cadastro',
  // Páginas públicas
  'precos', 'sobre', 'contato', 'docs', 'blog',
  // Prefixo SEO de nicho
  'para',
  // Demo
  'suporte',
];

// Rotas que crawlers e bots SEMPRE devem acessar sem interceptação
// Mesmo em subdomínios de cliente, esses paths devem passar direto
const CRAWLER_PASSTHROUGH = ['/robots.txt', '/sitemap.xml', '/sitemap.ts'];

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // ── 0. PASSTHROUGH PARA CRAWLERS ─────────────────────────────────────────
  // robots.txt e sitemap.xml nunca devem ser interceptados — passam direto
  if (CRAWLER_PASSTHROUGH.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── 1. DETECÇÃO DE SUBDOMÍNIO DE CLIENTE ──────────────────────────────────
  const isMinhaiBr  = hostname.endsWith('.minhai.com.br') && !hostname.startsWith('www.');
  const isMinhaiApp = hostname.endsWith('.minhai.app') && !hostname.startsWith('www.');
  const isDev       = hostname.includes('.localhost');

  if (isMinhaiBr || isMinhaiApp || isDev) {
    const slug = isMinhaiBr
      ? hostname.replace('.minhai.com.br', '')
      : isMinhaiApp
      ? hostname.replace('.minhai.app', '')
      : hostname.split('.')[0];

    if (slug && !RESERVED_SUBDOMAINS.includes(slug)) {

      // ── Favicon dinâmico ──────────────────────────────────────────────────
      if (pathname === '/favicon.ico') {
        const url = request.nextUrl.clone();
        url.pathname = '/api/favicon';
        url.searchParams.set('slug', slug);
        return NextResponse.rewrite(url);
      }

      // ── Manifest (browsers pedem tanto .json quanto .webmanifest) ─────────
      if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
        const url = request.nextUrl.clone();
        url.pathname = '/manifest.webmanifest';
        url.searchParams.set('slug', slug);
        return NextResponse.rewrite(url);
      }

      // ── Service Worker ────────────────────────────────────────────────────
      if (pathname === '/sw.js') {
        const url = request.nextUrl.clone();
        url.pathname = '/sw.js';
        url.searchParams.set('slug', slug);
        return NextResponse.rewrite(url);
      }

      // ── Rewrite do slug com suporte a rotas específicas ───────────────────
      const url = request.nextUrl.clone();

      const SPECIAL_ROUTES = ['/vendas', '/fila', '/cliente', '/link'];
      const isSpecialRoute = SPECIAL_ROUTES.some(route => pathname.startsWith(route));

      if (isSpecialRoute) {
        const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
        url.pathname = `${cleanPath}/${slug}`;
      } else {
        url.pathname = `/ia/${slug}${pathname === '/' ? '' : pathname}`;
      }

      return NextResponse.rewrite(url);
    }
  }

  // ── 2. FLUXO NORMAL (www.minhai.app / www.minhai.com.br) ──────────────────
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

  const isProtectedRoute = pathname.startsWith('/dashboard');

  // 3. Sem login → redireciona para /login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 4. Logado tentando acessar /login → redireciona para /dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 5. Rotas que exigem plano ativo
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
      const redirectUrl = new URL('/dashboard/credits', request.url);
      redirectUrl.searchParams.set('requires_plan', '1');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Adicionado robots.txt e sitemap.xml explicitamente para o middleware processar
    // (e então o passthrough acima liberar imediatamente)
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
