// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { BrandKey } from './lib/brand'; // troque por '@/lib/brand' se for a convenção do repo

const PLAN_PROTECTED_ROUTES = [
  '/dashboard/producao',
];

const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'pay', 'admin', 'mail', 'smtp',
  'dashboard', 'login', 'cadastro',
  'precos', 'sobre', 'contato', 'docs', 'blog',
  'para',
  'suporte', 'ajuda', 'status', 'cdn', 'assets', 'static', 'files',
  'noticias', 'termos', 'privacidade', 'seguranca', 'abuse', 'postmaster',
  'webmaster', 'noreply', 'no-reply', 'root', 'test', 'teste', 'demo',
  'staging', 'dev', 'beta', 'null', 'undefined', 'me', 'eu',
  'minhai', 'artefinal', 'consultatec', 'pix', 'minia', 'bigcorps',
  'melhoria', 'melhor', 'funcionaria',
  'convite', 'convites', 'conviteia', 'convite-ai', 'ai', 'ia',
  // 'mcp' precisa estar aqui: o proxy mcp.minhai.app do next.config é um
  // rewrite beforeFiles, que roda DEPOIS do middleware. Sem reservar,
  // mcp.minhai.app é tratado como slug de cliente e vai pra /ia/mcp.
  'mcp',
];

const CRAWLER_PASSTHROUGH = [
  '/robots.txt',
  '/sitemap.xml',
  '/sitemap.ts',
  // llms.txt entra aqui porque, como o robots, ele precisa ser servido pelo
  // host que o crawler pediu — sem passar por rewrite de marca antes da hora.
  '/llms.txt',
];

// ── llms.txt por marca (GEO) ─────────────────────────────────────────────────
// public/llms.txt descreve a minhAi. Sem este mapa, cada host de marca poderia
// entregar a descrição do produto errado para ChatGPT, Claude, Perplexity etc.
const LLMS_TXT_BY_HOST: Record<string, string> = {
  'conviteia.com':       '/brands/convite/llms.txt',
  'www.conviteia.com':   '/brands/convite/llms.txt',
  'app.min.ia.br':       '/brands/minia/llms.txt',
  'ia.artefinal.app':    '/brands/artefinal/llms.txt',
  'pix.wiki':            '/brands/pix/llms.txt',
  'www.pix.wiki':        '/brands/pix/llms.txt',
  'consulta.tec.br':     '/brands/consultatec/llms.txt',
  'www.consulta.tec.br': '/brands/consultatec/llms.txt',
  'melhoria.org':        '/brands/melhoria/llms.txt',
  'www.melhoria.org':    '/brands/melhoria/llms.txt',
  'funcionaria.net':     '/brands/funcionaria/llms.txt',
  'www.funcionaria.net': '/brands/funcionaria/llms.txt',
};

// Caminhos das páginas legais que cada marca serve na raiz do próprio domínio.
const PAGINAS_LEGAIS = ['/aviso', '/termos', '/exclusao'];

const ARTEFINAL_DOMAINS = ['ia.artefinal.app'];
const CONSULTATEC_DOMAINS = ['consulta.tec.br', 'www.consulta.tec.br'];
const PIX_DOMAINS = ['pix.wiki', 'www.pix.wiki'];
const MELHORIA_DOMAINS = ['melhoria.org', 'www.melhoria.org'];
const FUNCIONARIA_DOMAINS = ['funcionaria.net', 'www.funcionaria.net'];

// ── Min.IA ───────────────────────────────────────────────────────────────────
const MINIA_APP_DOMAINS = ['app.min.ia.br'];

// ── Todos os domínios de subdomínio de cliente ───────────────────────────────
type SubdomainDomain = { suffix: string; pattern: RegExp; brand: BrandKey };

const SUBDOMAIN_DOMAINS: SubdomainDomain[] = [
  { suffix: '.minhai.com.br', pattern: /^(.+)\.minhai\.com\.br$/, brand: 'minhai'    },
  { suffix: '.minhaia.app',   pattern: /^(.+)\.minhaia\.app$/,    brand: 'minhai'    },
  { suffix: '.nossaia.app',   pattern: /^(.+)\.nossaia\.app$/,    brand: 'minhai'    },
  { suffix: '.suaia.app',     pattern: /^(.+)\.suaia\.app$/,      brand: 'minhai'    },
  { suffix: '.minhai.app',    pattern: /^(.+)\.minhai\.app$/,     brand: 'minhai'    },
  { suffix: '.conviteia.com', pattern: /^(.+)\.conviteia\.com$/,  brand: 'conviteia' },
  { suffix: '.funcionaria.net', pattern: /^(.+)\.funcionaria\.net$/, brand: 'funcionaria' },
];

function extractSlug(hostname: string): { slug: string; brand: BrandKey } | null {
  if (hostname.includes('.localhost')) {
    const brand: BrandKey = hostname.includes('.conviteia.localhost')
      ? 'conviteia'
      : hostname.includes('.funcionaria.localhost')
        ? 'funcionaria'
        : 'minhai';
    return { slug: hostname.split('.')[0], brand };
  }
  for (const { pattern, brand } of SUBDOMAIN_DOMAINS) {
    const match = hostname.match(pattern);
    if (match) return { slug: match[1], brand };
  }
  return null;
}

function isSubdomainHost(hostname: string): boolean {
  if (hostname.includes('.localhost')) return true;
  return SUBDOMAIN_DOMAINS.some(({ suffix }) =>
    hostname.endsWith(suffix) && !hostname.startsWith('www.')
  );
}

function withPathname(request: NextRequest, pathname: string): Headers {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);
  return headers;
}

function readOnlySupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const pathname = request.nextUrl.pathname;
  const requestHeaders = withPathname(request, pathname);

  // ── 0.0. llms.txt POR MARCA ───────────────────────────────────────────────
  if (pathname === '/llms.txt') {
    const target = LLMS_TXT_BY_HOST[hostname];
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // ── 0.F. FUNCIONARIA.NET ──────────────────────────────────────────────────
  // A raiz e o onboarding são públicos para aquisição. Dashboard e ferramentas
  // de operação continuam protegidos. Os subdomínios de empresas são tratados no bloco
  // genérico de subdomínios mais abaixo e reescritos para /funcionaria/public.
  if (FUNCIONARIA_DOMAINS.includes(hostname)) {
    if (hostname === 'www.funcionaria.net') {
      const url = request.nextUrl.clone();
      url.hostname = 'funcionaria.net';
      return NextResponse.redirect(url);
    }

    if (CRAWLER_PASSTHROUGH.some((p) => pathname.startsWith(p))) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Infra compartilhada / OAuth / TWA.
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/.well-known/')
    ) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (pathname === '/favicon.ico') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/funcionaria/favicon.png';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/funcionaria/manifest.webmanifest';
      return NextResponse.rewrite(url);
    }

    if (pathname.startsWith('/brands/') || /\.[a-z0-9]{2,12}$/i.test(pathname)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Nunca expõe o prefixo interno do App Router.
    if (pathname === '/funcionaria' || pathname.startsWith('/funcionaria/')) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/funcionaria/, '') || '/';
      return NextResponse.redirect(url);
    }

    const supabase = readOnlySupabase(request);
    const { data: { user } } = await supabase.auth.getUser();

    if (pathname === '/login') {
      // Quando o visitante termina o onboarding antes de criar conta, o login
      // precisa continuar acessível mesmo após OAuth/confirmacao de e-mail para
      // que a própria página finalize o rascunho pendente.
      const pendingOnboarding = request.nextUrl.searchParams.get('destino') === 'onboarding';
      if (user && !pendingOnboarding) return NextResponse.redirect(new URL('/dashboard', request.url));
      const url = request.nextUrl.clone();
      url.pathname = '/funcionaria/login';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    // Landing pública — "Contrate sua FuncionarIA grátis agora mesmo".
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/funcionaria';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    const protectedPrefixes = ['/dashboard', '/nova', '/terminal'];
    const isProtected = protectedPrefixes.some((prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isProtected && !user) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // URL limpa: /dashboard -> /funcionaria/dashboard, etc.
    const url = request.nextUrl.clone();
    url.pathname = `/funcionaria${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // ── 0. DOMÍNIO ARTEFINAL.APP ──────────────────────────────────────────────
  if (ARTEFINAL_DOMAINS.includes(hostname)) {
    if (CRAWLER_PASSTHROUGH.some((p) => pathname.startsWith(p))) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (pathname === '/favicon.ico') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/artefinal/favicon.png';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/artefinal/manifest.webmanifest';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/arte';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (pathname === '/arte/login') {
      const supabase = readOnlySupabase(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return NextResponse.redirect(new URL('/arte', request.url));
      return NextResponse.next();
    }

    if (pathname === '/arte') {
      const supabase = readOnlySupabase(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.redirect(new URL('/arte/login', request.url));
      return NextResponse.next();
    }
  }

  // ── 0.1. DOMÍNIO APP.MIN.IA.BR (Min.IA) ───────────────────────────────────
  if (MINIA_APP_DOMAINS.includes(hostname)) {
    if (pathname === '/favicon.ico') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/minia/favicon.png';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/minia/manifest.webmanifest';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/min';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (pathname === '/min/login') {
      const supabase = readOnlySupabase(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return NextResponse.redirect(new URL('/min', request.url));
      return NextResponse.next();
    }
  }

  // ── 0.05. DOMÍNIO CONSULTA.TEC.BR ─────────────────────────────────────────
  if (CONSULTATEC_DOMAINS.includes(hostname)) {
    if (CRAWLER_PASSTHROUGH.some((p) => pathname.startsWith(p))) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (hostname === 'www.consulta.tec.br') {
      const url = request.nextUrl.clone();
      url.hostname = 'consulta.tec.br';
      return NextResponse.redirect(url);
    }

    if (pathname === '/favicon.ico') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/consultatec/favicon.png';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/consultatec/manifest.webmanifest';
      return NextResponse.rewrite(url);
    }

    if (PAGINAS_LEGAIS.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = `/consultatec${pathname}`;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/consultatec';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
  }

  // ── 0.15. DOMÍNIO MELHORIA.ORG ────────────────────────────────────────────
  if (MELHORIA_DOMAINS.includes(hostname)) {
    if (hostname === 'www.melhoria.org') {
      const url = request.nextUrl.clone();
      url.hostname = 'melhoria.org';
      return NextResponse.redirect(url);
    }

    if (CRAWLER_PASSTHROUGH.some((p) => pathname.startsWith(p))) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/.well-known/')
    ) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (pathname === '/favicon.ico') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/melhoria/favicon.png';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/melhoria/manifest.webmanifest';
      return NextResponse.rewrite(url);
    }

    if (pathname.startsWith('/brands/')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (/\.[a-z0-9]{2,12}$/i.test(pathname)) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (pathname === '/melhoria' || pathname.startsWith('/melhoria/')) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/melhoria/, '') || '/';
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/melhoria${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // ── 0.2. DOMÍNIO PIX.WIKI ─────────────────────────────────────────────────
  if (PIX_DOMAINS.includes(hostname)) {
    if (hostname === 'www.pix.wiki') {
      const url = request.nextUrl.clone();
      url.hostname = 'pix.wiki';
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/.well-known/')) return NextResponse.next();
    if (pathname.startsWith('/auth/')) return NextResponse.next();
    if (pathname.startsWith('/api/')) return NextResponse.next();

    if (pathname === '/favicon.ico') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/pix/favicon.png';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/pix/manifest.webmanifest';
      return NextResponse.rewrite(url);
    }

    if (CRAWLER_PASSTHROUGH.some((p) => pathname.startsWith(p))) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (pathname === '/pix' || pathname.startsWith('/pix/')) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/pix/, '') || '/';
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = pathname === '/' ? '/pix' : `/pix${pathname}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // ── 0. PASSTHROUGH PARA CRAWLERS ──────────────────────────────────────────
  if (CRAWLER_PASSTHROUGH.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── 0.5. PASSTHROUGH PARA /pay ────────────────────────────────────────────
  if (pathname.startsWith('/pay/')) {
    return NextResponse.next();
  }

  // ── 0.6. CONVITEIA — RAIZ DO DOMÍNIO ─────────────────────────────────────
  if (hostname === 'conviteia.com' || hostname === 'www.conviteia.com') {
    if (pathname.startsWith('/.well-known/')) return NextResponse.next();

    if (pathname === '/favicon.ico') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/convite/favicon.png';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/convite/manifest.webmanifest';
      return NextResponse.rewrite(url);
    }

    if (PAGINAS_LEGAIS.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = `/convite${pathname}`;
      return NextResponse.rewrite(url);
    }

    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/convite';
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }

    if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── 1. DETECÇÃO DE SUBDOMÍNIO DE CLIENTE ──────────────────────────────────
  if (isSubdomainHost(hostname)) {
    const matched = extractSlug(hostname);

    if (matched && !RESERVED_SUBDOMAINS.includes(matched.slug)) {
      const { slug, brand } = matched;

      // FuncionarIA tem uma experiência pública própria. O cliente final não
      // precisa autenticar para abrir empresa.funcionaria.net.
      if (brand === 'funcionaria') {
        if (
          pathname.startsWith('/api/') ||
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/_next/') ||
          pathname.startsWith('/.well-known/')
        ) {
          return NextResponse.next();
        }

        // Reaproveita os modos públicos já maduros da minhAi. A URL continua
        // limpa em empresa.funcionaria.net/vendas e /fila, mas internamente
        // usamos exatamente os componentes existentes de vendas e fila.
        if (pathname === '/vendas') {
          const url = request.nextUrl.clone();
          url.pathname = `/vendas/${slug}`;
          return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
        }
        if (pathname === '/fila') {
          const url = request.nextUrl.clone();
          url.pathname = `/fila/${slug}`;
          return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
        }

        if (pathname === '/favicon.ico') {
          const url = request.nextUrl.clone();
          url.pathname = '/brands/funcionaria/favicon.png';
          return NextResponse.rewrite(url);
        }

        if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
          const url = request.nextUrl.clone();
          url.pathname = '/brands/funcionaria/manifest.webmanifest';
          return NextResponse.rewrite(url);
        }

        const url = request.nextUrl.clone();
        const cleanPath = pathname === '/' ? '' : pathname;
        url.pathname = `/funcionaria/public/${slug}${cleanPath}`;
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      }

      const isConviteia = brand === 'conviteia';
      const base = isConviteia ? '/convite' : '/ia';

      if (isConviteia && (pathname.startsWith('/api/') || pathname.startsWith('/auth/'))) {
        return NextResponse.next();
      }

      if (pathname === '/favicon.ico') {
        const url = request.nextUrl.clone();
        url.pathname = '/api/favicon';
        url.searchParams.set('slug', slug);
        url.searchParams.set('brand', brand);
        return NextResponse.rewrite(url);
      }

      if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
        const url = request.nextUrl.clone();
        url.pathname = '/manifest.webmanifest';
        url.searchParams.set('slug', slug);
        url.searchParams.set('brand', brand);
        return NextResponse.rewrite(url);
      }

      if (pathname === '/sw.js') {
        const url = request.nextUrl.clone();
        url.pathname = '/sw.js';
        url.searchParams.set('slug', slug);
        url.searchParams.set('brand', brand);
        return NextResponse.rewrite(url);
      }

      const url = request.nextUrl.clone();
      const SPECIAL_ROUTES = ['/vendas', '/fila', '/pay', '/cliente', '/link', '/site'];
      const isSpecialRoute =
        !isConviteia && SPECIAL_ROUTES.some(route => pathname.startsWith(route));

      if (isSpecialRoute) {
        const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
        url.pathname = `${cleanPath}/${slug}`;
      } else if (pathname === '/' || pathname === base) {
        url.pathname = `${base}/${slug}`;
        const response = NextResponse.rewrite(url);
        if (pathname === '/') response.headers.set('x-came-from-root', '1');
        return response;
      } else {
        url.pathname = `${base}/${slug}${pathname}`;
      }

      return NextResponse.rewrite(url);
    }
  }

  // ── 2. FLUXO NORMAL ────────────────────────────────────────────────────────
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: requestHeaders } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: requestHeaders } });
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
