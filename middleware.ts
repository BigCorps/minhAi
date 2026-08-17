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
// public/llms.txt descreve a minhAi. Sem este mapa, conviteia.com/llms.txt e
// app.min.ia.br/llms.txt entregariam a descrição do produto errado para
// ChatGPT, Claude, Perplexity e Gemini.
// Marca sem entrada aqui continua servindo o llms.txt da raiz.
const LLMS_TXT_BY_HOST: Record<string, string> = {
  'conviteia.com':     '/brands/convite/llms.txt',
  'www.conviteia.com': '/brands/convite/llms.txt',
  'app.min.ia.br':     '/brands/minia/llms.txt',
  'ia.artefinal.app':  '/brands/artefinal/llms.txt',
  'pix.wiki':          '/brands/pix/llms.txt',
  'www.pix.wiki':      '/brands/pix/llms.txt',
  'consulta.tec.br':     '/brands/consultatec/llms.txt',
  'www.consulta.tec.br': '/brands/consultatec/llms.txt',
  // app.min.ia.br e ia.artefinal.app são ferramenta, não produto: os arquivos
  // apontados aqui são curtos e mandam o modelo para o llms.txt da landing.
};

// Caminhos das páginas legais que cada marca serve na raiz do próprio domínio.
// Usado pelos blocos de host para reescrever conviteia.com/aviso -> /convite/aviso
// e consulta.tec.br/aviso -> /consultatec/aviso. O Pix Wiki não usa esta lista:
// o bloco dele já prefixa qualquer caminho com /pix.
const PAGINAS_LEGAIS = ['/aviso', '/termos', '/exclusao'];

const ARTEFINAL_DOMAINS = ['ia.artefinal.app'];

const CONSULTATEC_DOMAINS = ['consulta.tec.br', 'www.consulta.tec.br'];

const PIX_DOMAINS = ['pix.wiki', 'www.pix.wiki'];

// ── Min.IA ───────────────────────────────────────────────────────────────
const MINIA_APP_DOMAINS = ['app.min.ia.br'];

// min.ia.br e www.min.ia.br NÃO chegam neste projeto: o apex está atribuído ao
// projeto da landing (repositório BigCorps/min.ia.br), que redireciona /min/*
// para cá. O redirect temporário que existia aqui virou código morto e foi
// removido — a requisição nunca passava por ele.
// Mesma situação de artefinal.app, cuja landing também é projeto separado.

// ── Todos os domínios de subdomínio de cliente ─────────────────────────────
// Toda entrada precisa de suffix + pattern + brand:
//   suffix  → usado por isSubdomainHost
//   pattern → usado por extractSlug
//   brand   → decide o destino do rewrite (/ia vs /convite)
// Se faltar um dos três a entrada silenciosamente para de funcionar.
type SubdomainDomain = { suffix: string; pattern: RegExp; brand: BrandKey };

const SUBDOMAIN_DOMAINS: SubdomainDomain[] = [
  { suffix: '.minhai.com.br', pattern: /^(.+)\.minhai\.com\.br$/, brand: 'minhai'    },
  { suffix: '.minhaia.app',   pattern: /^(.+)\.minhaia\.app$/,    brand: 'minhai'    },
  { suffix: '.nossaia.app',   pattern: /^(.+)\.nossaia\.app$/,    brand: 'minhai'    },
  { suffix: '.suaia.app',     pattern: /^(.+)\.suaia\.app$/,      brand: 'minhai'    },
  { suffix: '.minhai.app',    pattern: /^(.+)\.minhai\.app$/,     brand: 'minhai'    },
  { suffix: '.conviteia.com', pattern: /^(.+)\.conviteia\.com$/,  brand: 'conviteia' },
];

function extractSlug(hostname: string): { slug: string; brand: BrandKey } | null {
  // Dev local: noivos.conviteia.localhost → marca conviteia
  //            loja.localhost            → marca minhai
  if (hostname.includes('.localhost')) {
    const brand: BrandKey = hostname.includes('.conviteia.localhost')
      ? 'conviteia'
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

// Repassa o caminho que o VISITANTE pediu para dentro do App Router.
// Necessário para o canonical: em conviteia.com e app.min.ia.br a raiz é
// reescrita (/ → /convite, / → /min), então o layout enxerga a rota interna,
// não a URL real. Sem este header o canonical sai errado nos dois domínios.
function withPathname(request: NextRequest, pathname: string): Headers {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);
  return headers;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const pathname = request.nextUrl.pathname;
  const requestHeaders = withPathname(request, pathname);

  // ── 0.0. llms.txt POR MARCA ───────────────────────────────────────────────
  // Vem antes de tudo: qualquer bloco de domínio abaixo poderia sequestrar
  // este caminho antes de ele chegar ao arquivo certo.
  if (pathname === '/llms.txt') {
    const target = LLMS_TXT_BY_HOST[hostname];
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
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

  // Rewrite raiz → /arte
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/arte';
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Evita loop: /arte não redireciona de volta para /
  if (pathname === '/arte') {
    // Deixa passar — será tratado abaixo com verificação de sessão
  }

  // Redireciona /arte/login para /arte se já estiver logado
  if (pathname === '/arte/login') {
    const supabase = createServerClient(
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return NextResponse.redirect(new URL('/arte', request.url));
    return NextResponse.next();
  }

  // Protege /arte: redireciona para /arte/login se não logado
  if (pathname === '/arte') {
    const supabase = createServerClient(
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

  // Rewrite raiz → /min (igual o padrão do ArteFinal pra /arte)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/min';
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // /min NÃO é protegido aqui — a página mostra o carrossel sem login e só
  // pede pra entrar quando o usuário interage com uma função. O gate fica
  // dentro do próprio componente (handleFunctionSelect), não no middleware.

  // Redireciona /min/login para /min se já estiver logado
  if (pathname === '/min/login') {
    const supabase = createServerClient(
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return NextResponse.redirect(new URL('/min', request.url));
    return NextResponse.next();
  }
}

// ── 0.05. DOMÍNIO CONSULTA.TEC.BR (cenário A — host único) ────────────────
if (CONSULTATEC_DOMAINS.includes(hostname)) {

  // robots.txt e sitemap.xml precisam ser servidos por este host, não
  // reescritos para dentro de /consultatec.
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

  // Páginas legais em URL curta: consulta.tec.br/aviso -> /consultatec/aviso.
  // Sem isto, /aviso cai no fluxo normal e serve app/aviso (marca minhAi) —
  // bug silencioso, porque a página existe e abre, só com a marca errada.
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

// ── 0.2. DOMÍNIO PIX.WIKI ────────────────────────────────────────────────
if (PIX_DOMAINS.includes(hostname)) {
  // Se usar www.pix.wiki, redireciona para pix.wiki
  if (hostname === 'www.pix.wiki') {
    const url = request.nextUrl.clone();
    url.hostname = 'pix.wiki';
    return NextResponse.redirect(url);
  }

  // Importante para TWA / Bubblewrap / Play Store
  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

   // Rotas de infra compartilhada (callback de OAuth, Google/Facebook) —
   // nunca prefixar com /pix, senão o retorno do login nunca chega na
   // rota real e a sessão nunca é criada.
   if (pathname.startsWith('/auth/')) {
     return NextResponse.next();
   }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Favicon específico do Pix
  if (pathname === '/favicon.ico') {
    const url = request.nextUrl.clone();
    url.pathname = '/brands/pix/favicon.png';
    return NextResponse.rewrite(url);
  }

  // Manifest específico do Pix
  if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
    const url = request.nextUrl.clone();
    url.pathname = '/brands/pix/manifest.webmanifest';
    return NextResponse.rewrite(url);
  }

  // Robots, sitemap e llms.txt continuam normais
  if (CRAWLER_PASSTHROUGH.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Se alguém acessar pix.wiki/pix ou pix.wiki/pix/minha-loja,
  // limpa a URL para pix.wiki ou pix.wiki/minha-loja
  if (pathname === '/pix' || pathname.startsWith('/pix/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/pix/, '') || '/';
    return NextResponse.redirect(url);
  }

  // pix.wiki           → /pix
  // pix.wiki/loja      → /pix/loja
  // pix.wiki/loja/10   → /pix/loja/10
  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/pix' : `/pix${pathname}`;
  // O x-pathname é o que permite ao app/pix/layout.tsx distinguir a landing
  // (pix.wiki/) da página de cobrança de um cliente (pix.wiki/minha-loja) —
  // as duas chegam no App Router como /pix/algo.
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

  // ── 0.6. CONVITEIA — RAIZ DO DOMÍNIO ──────────────────────────────────────
  // Precisa vir ANTES da detecção de subdomínio e DEPOIS dos passthroughs.
  // O bloco 1 só trata subdomínio; sem isto, conviteia.com cairia no fluxo
  // normal e serviria a landing da minhAi.
  if (hostname === 'conviteia.com' || hostname === 'www.conviteia.com') {

    // Passthrough para TWA / Play Store (Digital Asset Links).
    // Hoje é no-op (o `return next()` no fim do bloco já resolveria), mas
    // documenta a intenção e protege contra reordenação futura do bloco.
    if (pathname.startsWith('/.well-known/')) {
      return NextResponse.next();
    }

    // Sem isto, /favicon.ico serve o app/favicon.ico (minhAi). Mesmo padrão
    // dos blocos 0, 0.05, 0.1 e 0.2.
    if (pathname === '/favicon.ico') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/convite/favicon.png';
      return NextResponse.rewrite(url);
    }

    // Sem isto, /manifest.json serve o public/manifest.json (minhAi) — era o
    // que fazia o PWA de conviteia.com instalar com nome e ícone da minhAi,
    // e o que faria o `bubblewrap init` gerar o app errado.
    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const url = request.nextUrl.clone();
      url.pathname = '/brands/convite/manifest.webmanifest';
      return NextResponse.rewrite(url);
    }

    // Páginas legais em URL curta: conviteia.com/aviso -> /convite/aviso.
    // Sem isto o caminho cai no fluxo normal e serve app/aviso (marca minhAi).
    // São as URLs declaradas na ficha da Play Store.
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

    // Auth e API do Conviteia usam a infra compartilhada: prefixar quebraria
    // o retorno do OAuth, igual ao que já acontece no bloco do Pix Wiki.
    if (pathname.startsWith('/auth/') || pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // /conviteia/criar, /conviteia/entrar e o resto seguem normalmente.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── 1. DETECÇÃO DE SUBDOMÍNIO DE CLIENTE ──────────────────────────────────
  if (isSubdomainHost(hostname)) {
    const matched = extractSlug(hostname);

    if (matched && !RESERVED_SUBDOMAINS.includes(matched.slug)) {
      const { slug, brand } = matched;

      // A marca decide a base do rewrite. conviteia → /convite/[slug],
      // todo o resto continua em /ia/[slug].
      const isConviteia = brand === 'conviteia';
      const base = isConviteia ? '/convite' : '/ia';

      // APIs/auth são compartilhadas e nunca podem virar /convite/[slug]/api/...
      // Isso é essencial para presentes, recados e demais ações públicas.
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

      // Rotas especiais são do fluxo minhAi (vendas, fila, etc.).
      // Em conviteia tudo mora embaixo de /convite/[slug].
      const SPECIAL_ROUTES = ['/vendas', '/fila', '/pay', '/cliente', '/link', '/site'];
      const isSpecialRoute =
        !isConviteia && SPECIAL_ROUTES.some(route => pathname.startsWith(route));

      if (isSpecialRoute) {
        const cleanPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
        url.pathname = `${cleanPath}/${slug}`;
      } else if (pathname === '/' || pathname === base) {
        url.pathname = `${base}/${slug}`;
        // Sinaliza para o page.tsx se veio da raiz (deve redirecionar) ou de /ia (não redireciona)
        const response = NextResponse.rewrite(url);
        if (pathname === '/') {
          response.headers.set('x-came-from-root', '1');
        }
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
