// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PLAN_PROTECTED_ROUTES = [
  '/dashboard/agenda',
  '/dashboard/atendimentos',
  '/dashboard/producao',
];

const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'pay', 'admin', 'mail', 'smtp',
  'dashboard', 'login', 'cadastro',
  'precos', 'sobre', 'contato', 'docs', 'blog',
  'para',
];

const CRAWLER_PASSTHROUGH = ['/robots.txt', '/sitemap.xml', '/sitemap.ts'];

// ── Todos os domínios de subdomínio de cliente ─────────────────────────────
const SUBDOMAIN_DOMAINS = [
  { suffix: '.minhai.com.br',  pattern: /^(.+)\.minhai\.com\.br$/ },
  { suffix: '.minhaia.app',    pattern: /^(.+)\.minhaia\.app$/ },
  { suffix: '.nossaia.app',    pattern: /^(.+)\.nossaia\.app$/ },
  { suffix: '.suaia.app',      pattern: /^(.+)\.suaia\.app$/ },
  { suffix: '.minhai.app',     pattern: /^(.+)\.minhai\.app$/ },
];

function extractSlug(hostname: string): string | null {
  // Dev local: loja.localhost
  if (hostname.includes('.localhost')) {
    return hostname.split('.')[0] || null;
  }
  for (const { pattern } of SUBDOMAIN_DOMAINS) {
    const match = hostname.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isSubdomainHost(hostname: string): boolean {
  if (hostname.includes('.localhost')) return true;
  return SUBDOMAIN_DOMAINS.some(({ suffix }) =>
    hostname.endsWith(suffix) && !hostname.startsWith('www.')
  );
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // ── 0. PASSTHROUGH PARA CRAWLERS ──────────────────────────────────────────
  if (CRAWLER_PASSTHROUGH.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── 0.5. PASSTHROUGH PARA /pay ────────────────────────────────────────────
  if (pathname.startsWith('/pay/')) {
    return NextResponse.next();
  }

  // ── 1. DETECÇÃO DE SUBDOMÍNIO DE CLIENTE ──────────────────────────────────
  if (isSubdomainHost(hostname)) {
    const slug = extractSlug(hostname);

    if (slug && !RESERVED_SUBDOMAINS.includes(slug)) {

      if (pathname === '/favicon.ico') {
        const url = request.nextUrl.clone();
        url.pathname = '/api/favicon';
        url.searchParams.set('slug', slug);
        return NextResponse.rewrite(url);
      }

      if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
        const url = request.nextUrl.clone();
        url.pathname = '/manifest.webmanifest';
        url.searchParams.set('slug', slug);
        return NextResponse.rewrite(url);
      }

      if (pathname === '/sw.js') {
        const url = request.nextUrl.clone();
        url.pathname = '/sw.js';
        url.searchParams.set('slug', slug);
        return NextResponse.rewrite(url);
      }

      const url = request.nextUrl.clone();
      const SPECIAL_ROUTES = ['/vendas', '/fila', '/pay', '/cliente', '/link'];
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

  // ── 2. FLUXO NORMAL ────────────────────────────────────────────────────────
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
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

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const requiresPlan = PLAN_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
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
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
