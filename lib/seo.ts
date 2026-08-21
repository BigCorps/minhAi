// lib/seo.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fonte única de verdade de SEO/GEO por marca.
//
// O repositório é multi-marca: o mesmo build responde por minhai.app,
// conviteia.com, app.min.ia.br, pix.wiki, consulta.tec.br e ia.artefinal.app.
// Antes deste arquivo, robots.ts e sitemap.ts tinham o domínio da minhAi
// escrito na mão — ou seja, conviteia.com/robots.txt apontava para o sitemap
// da minhAi, e conviteia.com/sitemap.xml listava URLs de outro domínio.
// Sitemap cross-domain o Google ignora.
//
// Regra: NADA de URL absoluta espalhada pelo app. Tudo sai daqui, resolvido
// pelo host da requisição.
//
// Este arquivo é PURO (sem headers(), sem fs, sem env): pode ser importado
// tanto por Server Components quanto por Client Components.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { getBrandByHost, type BrandKey } from './brand';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ChangeFreq =
  | 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface SitemapEntry {
  /** Caminho relativo ao baseUrl da marca, começando com "/". */
  path: string;
  changeFrequency: ChangeFreq;
  priority: number;
}

export interface BrandSeo {
  key: BrandKey;

  /** Domínio canônico da marca. É o que vai em <link rel="canonical">,
   *  no host do robots.txt e na URL de cada entrada do sitemap.
   *  Precisa ser um endereço que responde 200 — nunca um que redireciona. */
  baseUrl: string;

  siteName: string;
  title: string;
  description: string;

  /** Caminho da imagem de compartilhamento (1200x630). Relativo. */
  ogImage: string;
  ogImageAlt: string;

  /** Ícone da aba, por marca. */
  favicon: string;
  appleIcon: string;
  manifest: string;

  twitter?: string;

  /** Caminho do llms.txt servido neste host (GEO). null = usa o da raiz. */
  llmsTxt: string | null;

  /** Prefixos bloqueados para todos os crawlers. */
  disallow: string[];

  /** Caminhos liberados explicitamente para crawlers de IA. */
  aiAllow: string[];

  /** Páginas públicas indexáveis desta marca. */
  sitemap: SitemapEntry[];
}

// ─── Configuração por marca ──────────────────────────────────────────────────

export const SEO: Record<BrandKey, BrandSeo> = {

  // ── minhAi ─────────────────────────────────────────────────────────────────
  minhai: {
    key: 'minhai',
    baseUrl: 'https://www.minhai.app',
    siteName: 'minhAi',
    title: 'minhAi — Seu Funcionário de IA que vende, atende e cobra 24h por dia',
    description:
      'Nunca mais perca venda por falta de resposta. Escolha entre o minhAi Smart (créditos por uso) ou minhAi Vendas (gratuito + 10% por venda). +100 funções, WhatsApp, PIX, totem e mais. Comece grátis.',
    ogImage: '/icons/og-image.png',
    ogImageAlt:
      'minhAi — Funcionário de IA que vende, atende e cobra 24h por dia para empresas brasileiras',
    favicon: '/icons/icon-192x192.png',
    appleIcon: '/icons/apple-touch-icon.png',
    manifest: '/manifest.json',
    twitter: '@bigcorpsbr',
    llmsTxt: null, // usa /llms.txt da raiz (public/llms.txt)
    disallow: [
      '/dashboard/',
      '/ia/',
      '/api/',
      '/vendas/',
      '/fila/',
      '/pix/',
      '/link/',
      '/login',
      '/cadastro',
      '/cliente/',
      // rotas das outras marcas: existem neste build, mas o dono delas é
      // outro domínio. Sem isto, minhai.app/convite e minhai.app/min viram
      // conteúdo duplicado de conviteia.com e app.min.ia.br.
      '/convite',
      '/min',
      '/arte',
      '/consultatec',
    ],
    aiAllow: [
      '/',
      '/precos',
      '/sobre',
      '/contato',
      '/docs',
      '/blog',
      '/para/',
      '/ia/suporte',
      '/tour',
    ],
    // As páginas fixas. As de nicho (/para/[slug]) entram no sitemap.ts,
    // que lê NICHO_PAGES — é lista gerada, não cabe aqui.
    sitemap: [
      { path: '/',            changeFrequency: 'weekly',  priority: 1.0  },
      { path: '/precos',      changeFrequency: 'weekly',  priority: 0.95 },
      { path: '/tour',        changeFrequency: 'monthly', priority: 0.90 },
      { path: '/docs',        changeFrequency: 'weekly',  priority: 0.80 },
      { path: '/sobre',       changeFrequency: 'monthly', priority: 0.75 },
      { path: '/blog',        changeFrequency: 'weekly',  priority: 0.75 },
      { path: '/ia/suporte',  changeFrequency: 'weekly',  priority: 0.70 },
      { path: '/contato',     changeFrequency: 'monthly', priority: 0.65 },
      { path: '/termos',      changeFrequency: 'monthly', priority: 0.50 },
      { path: '/exclusao',    changeFrequency: 'monthly', priority: 0.50 },
    ],
  },

  // ── Convite IA ─────────────────────────────────────────────────────────────
  conviteia: {
    key: 'conviteia',
    baseUrl: 'https://conviteia.com',
    siteName: 'Convite IA',
    title: 'Convite IA — Convite digital de casamento e aniversário feito com IA',
    description:
      'Monte seu convite digital em um assistente de 10 etapas e veja o resultado em tempo real. Endereço próprio (seunome.conviteia.com), confirmação de presença, mural de recados e lista de presentes que recebe PIX. R$ 29,90 o convite, publicado para sempre.',
    ogImage: '/brands/convite/og.png',
    ogImageAlt: 'Convite IA — crie seu convite digital com IA',
    favicon: '/brands/convite/favicon.png',
    appleIcon: '/brands/convite/apple-icon.png',
    manifest: '/brands/convite/manifest.webmanifest',
    twitter: '@bigcorpsbr',
    llmsTxt: '/brands/convite/llms.txt',
    disallow: [
      '/api/',
      '/auth/',
      '/convite/entrar',
      '/convite/pagar',
      '/convite/painel',
      '/convite/editar',
      '/convite/google',
      '/dashboard/',
      '/login',
      '/cadastro',
    ],
    aiAllow: ['/', '/convite/criar'],
    sitemap: [
      { path: '/',              changeFrequency: 'weekly',  priority: 1.0  },
      { path: '/convite/criar', changeFrequency: 'monthly', priority: 0.90 },
    ],
  },

  // ── min.IA ─────────────────────────────────────────────────────────────────
  // ATENÇÃO: min.ia.br NÃO é servido por este projeto. O apex está no projeto
  // da landing (repositório BigCorps/min.ia.br), que redireciona /min/* para
  // cá. Este build responde apenas por app.min.ia.br — a FERRAMENTA.
  //
  // Mesmo tratamento do ArteFinal: a ferramenta é noindex e canonicaliza para
  // a landing. Quem ranqueia, acumula autoridade e é citado por IA é
  // min.ia.br. O baseUrl abaixo continua sendo o host real deste build,
  // porque é ele que monta as URLs absolutas de OG e ícones.
  minia: {
    key: 'minia',
    baseUrl: 'https://app.min.ia.br',
    siteName: 'min.IA',
    title: 'min.IA — Painel Pessoal da minhAi',
    description:
      'Execute PIX, consultas, agendamentos, traduções e +100 funções de IA pelo chat. A versão mini e pessoal da minhAi. 20 créditos grátis no cadastro, sem cartão.',
    ogImage: '/brands/minia/og.png',
    ogImageAlt: 'min.IA — a versão mini e pessoal da minhAi',
    favicon: '/brands/minia/favicon.png',
    appleIcon: '/brands/minia/apple-touch-icon.png',
    manifest: '/brands/minia/manifest.webmanifest',
    twitter: '@bigcorpsbr',
    // Aponta para a landing: este llms.txt é um redirecionamento textual, não
    // a descrição completa do produto (essa vive em min.ia.br/llms.txt).
    llmsTxt: '/brands/minia/llms.txt',
    disallow: ['/'],
    aiAllow: [],
    sitemap: [],
  },

  // ── ArteFinal ──────────────────────────────────────────────────────────────
  // A landing pública do ArteFinal é o artefinal.app (outro projeto).
  // ia.artefinal.app é a ferramenta logada: nada aqui deve ser indexado.
  artefinal: {
    key: 'artefinal',
    baseUrl: 'https://ia.artefinal.app',
    siteName: 'ArteFinal.app',
    title: 'ArteFinal.app — Seu arte-finalista com IA',
    description:
      'Fechamento de arquivo com sangria, faca de recorte, vetorização e PDF/X-1a em CMYK ISO Coated v2. Ferramenta para gráficas, papelarias e designers.',
    // O logo.png referenciado pelo layout antigo NÃO existe em
    // public/brands/artefinal/ — o cartão de compartilhamento estava quebrado.
    ogImage: '/brands/artefinal/og.png',
    ogImageAlt: 'ArteFinal.app — seu arte-finalista com IA',
    favicon: '/brands/artefinal/favicon.png',
    appleIcon: '/brands/artefinal/apple-touch-icon.png',
    manifest: '/brands/artefinal/manifest.webmanifest',
    // Aponta para a landing, igual à min.IA: este arquivo é um
    // redirecionamento textual, não a descrição do produto.
    llmsTxt: '/brands/artefinal/llms.txt',
    // ia.artefinal.app é a FERRAMENTA, protegida por login (bloco 0 do
    // middleware: sem sessão, tudo cai em /arte/login). A landing pública do
    // produto é artefinal.app, que é outro projeto. Indexar um host que só
    // devolve tela de login gera página fina e canibaliza a landing real.
    // Se algum dia este host servir conteúdo aberto, troque para a lista
    // comentada abaixo.
    disallow: ['/'],
    // disallow: ['/api/', '/auth/', '/arte/login', '/arte/perfil'],
    aiAllow: [],
    sitemap: [],
  },

  // ── Pix Wiki ───────────────────────────────────────────────────────────────
  pix: {
    key: 'pix',
    baseUrl: 'https://pix.wiki',
    siteName: 'pix.wiki',
    title: 'Pix.Wiki — Link e QR Code Pix com confirmação automática',
    description:
      'Link de cobrança Pix grátis com o nome do seu negócio. O sistema confirma o pagamento direto no banco: fim do comprovante falso. Sem mensalidade, 1% só no saque.',
    // pixwiki.png é o ícone 5197x5197 — pesado e quadrado, ruim como cartão.
    ogImage: '/brands/pix/og.png',
    ogImageAlt: 'pix.wiki — cobrança Pix com confirmação automática',
    favicon: '/brands/pix/favicon.png',
    appleIcon: '/brands/pix/apple-touch-icon.png',
    manifest: '/brands/pix/manifest.webmanifest',
    llmsTxt: '/brands/pix/llms.txt',
    // As páginas de cobrança de cliente moram na RAIZ do domínio
    // (pix.wiki/minha-loja), então não há prefixo para bloquear aqui.
    // O noindex delas é aplicado em app/pix/layout.tsx, pelo x-pathname.
    disallow: [
      '/api/',
      '/auth/',
      '/dashboard',
      '/login',
      '/cadastro',
      '/pix/dashboard',
      '/pix/login',
    ],
    aiAllow: ['/'],
    sitemap: [{ path: '/', changeFrequency: 'weekly', priority: 1.0 }],
  },

  // ── ConsultaTec ────────────────────────────────────────────────────────────
  // ── MelhorIA ───────────────────────────────────────────────────────────────
  melhoria: {
    key: 'melhoria',
    baseUrl: 'https://melhoria.org',
    siteName: 'MelhorIA',
    title: 'MelhorIA — a IA da Melhor Idade!',
    description:
      'Lembrete de remédio na hora certa, consultas e exames anotados e verificação antifraude de boleto e link. Cadastrar e ser lembrado é grátis, sempre.',
    ogImage: '/brands/melhoria/og.png',
    ogImageAlt: 'MelhorIA — a IA da Melhor Idade!',
    favicon: '/brands/melhoria/favicon.png',
    appleIcon: '/brands/melhoria/apple-touch-icon.png',
    manifest: '/brands/melhoria/manifest.webmanifest',
    llmsTxt: '/brands/melhoria/llms.txt',
    disallow: [
      '/api/',
      '/auth/',
      '/dashboard',
      '/login',
      '/cadastro',
      '/melhoria/login',
      '/melhoria/remedios',
      '/melhoria/agenda',
      '/melhoria/compras',
    ],
    aiAllow: ['/'],
    sitemap: [{ path: '/', changeFrequency: 'weekly', priority: 1.0 }],
  },

  consultatec: {
    key: 'consultatec',
    baseUrl: 'https://consulta.tec.br',
    siteName: 'ConsultaTec',
    title: 'ConsultaTec — Consulta de CPF e CNPJ sem burocracia',
    description:
      'Digite o documento: o sistema identifica se é CPF ou CNPJ e mostra as consultas disponíveis com o preço de cada uma. A partir de R$ 3,00, pago por Pix, sem assinatura.',
    // O layout antigo apontava para /brands/consultatec/og.png, que NÃO existia
    // no repositório: o cartão de compartilhamento vinha vazio. Agora existe.
    ogImage: '/brands/consultatec/og.png',
    ogImageAlt: 'ConsultaTec — consulta de CPF e CNPJ',
    favicon: '/brands/consultatec/favicon.png',
    appleIcon: '/brands/consultatec/apple-touch-icon.png',
    manifest: '/brands/consultatec/manifest.webmanifest',
    llmsTxt: '/brands/consultatec/llms.txt',
    disallow: [
      '/api/',
      '/auth/',
      '/dashboard',
      '/login',
      '/cadastro',
      '/consultatec/login',
      '/consultatec/dashboard',
    ],
    aiAllow: ['/'],
    sitemap: [{ path: '/', changeFrequency: 'weekly', priority: 1.0 }],
  },
};

// ─── Subdomínios de cliente ──────────────────────────────────────────────────
// slug.minhai.app  → assistente de um cliente
// slug.conviteia.com → convite publicado de um cliente
//
// Nenhum dos dois deve entrar em índice de busca: são páginas de terceiros,
// pessoais, e multiplicariam o domínio em milhares de URLs finas.
// Se um dia a decisão mudar (convites públicos indexáveis, por exemplo),
// é aqui que se muda — robots.ts e os layouts leem esta função.
//
// MANTER EM SINCRONIA com SUBDOMAIN_DOMAINS e RESERVED_SUBDOMAINS do
// middleware.ts.

const CLIENT_SUBDOMAIN_SUFFIXES = [
  '.minhai.com.br',
  '.minhaia.app',
  '.nossaia.app',
  '.suaia.app',
  '.minhai.app',
  '.conviteia.com',
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
  'mcp',
];

export function cleanHost(host: string): string {
  return host.split(':')[0].toLowerCase();
}

/** true para slug.minhai.app, slug.conviteia.com e afins. */
export function isClientSubdomain(host: string): boolean {
  const h = cleanHost(host);
  const suffix = CLIENT_SUBDOMAIN_SUFFIXES.find((s) => h.endsWith(s));
  if (!suffix) return false;
  const slug = h.slice(0, h.length - suffix.length);
  if (!slug || slug.includes('.')) return false;
  return !RESERVED_SUBDOMAINS.includes(slug);
}

// ─── Resolução por host ──────────────────────────────────────────────────────

export interface ResolvedSeo {
  brand: BrandKey;
  seo: BrandSeo;
  /** Host da requisição, já limpo. */
  host: string;
  /** Página de cliente (assistente ou convite publicado): não indexar. */
  clientPage: boolean;
}

export function resolveSeo(host: string): ResolvedSeo {
  const h = cleanHost(host);
  const clientPage = isClientSubdomain(h);

  // Em subdomínio de cliente o getBrandByHost cai no default 'minhai'.
  // Para .conviteia.com a marca correta é conviteia.
  const brand: BrandKey = clientPage
    ? (h.endsWith('.conviteia.com') ? 'conviteia' : 'minhai')
    : getBrandByHost(h);

  return { brand, seo: SEO[brand], host: h, clientPage };
}

/** URL absoluta canônica da marca. Em página de cliente, o canônico é o
 *  próprio subdomínio — o convite do cliente não canonicaliza para a
 *  landing do Convite IA, seria descartado pelo Google. */
export function canonicalUrl(resolved: ResolvedSeo, path = '/'): string {
  const base = resolved.clientPage
    ? `https://${resolved.host}`
    : resolved.seo.baseUrl;
  const clean = path === '/' ? '' : path.replace(/\/+$/, '');
  return `${base}${clean}`;
}

export function absoluteUrl(resolved: ResolvedSeo, path: string): string {
  if (path.startsWith('http')) return path;
  return `${resolved.seo.baseUrl}${path}`;
}

// ─── Metadata pronta ─────────────────────────────────────────────────────────
// Usada pelos layouts de marca. Recebe o host já lido com headers() no
// layout — este arquivo continua puro.

export interface BuildMetadataOptions {
  host: string;
  /** Caminho canônico da página. Default "/". */
  path?: string;
  /** Sobrescreve título/descrição da marca (páginas internas). */
  title?: string;
  description?: string;
  /** Força noindex (páginas de cliente, áreas logadas). */
  noindex?: boolean;
}

export function buildBrandMetadata(opts: BuildMetadataOptions): Metadata {
  const resolved = resolveSeo(opts.host);
  const { seo, clientPage } = resolved;

  const title = opts.title ?? seo.title;
  const description = opts.description ?? seo.description;
  const canonical = canonicalUrl(resolved, opts.path ?? '/');
  const ogImage = absoluteUrl(resolved, seo.ogImage);
  const noindex = opts.noindex ?? clientPage;

  return {
    metadataBase: new URL(seo.baseUrl),
    title: { absolute: title },
    description,
    applicationName: seo.siteName,
    manifest: seo.manifest,
    authors: [{ name: 'BigCorps', url: 'https://bigcorps.com.br' }],
    creator: 'BigCorps',
    publisher: 'BigCorps',

    alternates: {
      canonical,
      languages: { 'pt-BR': canonical },
    },

    robots: noindex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
          },
        },

    icons: {
      icon: seo.favicon,
      shortcut: seo.favicon,
      apple: seo.appleIcon,
    },

    openGraph: {
      type: 'website',
      url: canonical,
      siteName: seo.siteName,
      title,
      description,
      locale: 'pt_BR',
      images: [
        { url: ogImage, width: 1200, height: 630, alt: seo.ogImageAlt, type: 'image/png' },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      ...(seo.twitter ? { creator: seo.twitter, site: seo.twitter } : {}),
    },
  };
}

// ─── JSON-LD ─────────────────────────────────────────────────────────────────
// A BigCorps é a MESMA entidade nas três marcas. O que amarra tudo é o @id da
// Organization com o mesmo CNPJ e o mesmo sameAs — é assim que um modelo de
// linguagem liga Convite IA e min.IA à minhAi e à BigCorps em vez de tratar
// como três empresas sem relação.

const ORG_ID = 'https://bigcorps.com.br/#organization';

// Landings públicas que vivem em OUTROS projetos Vercel. As rotas equivalentes
// dentro deste build são ferramenta logada: noindex, canonical para cá.
export const LANDING_URL: Partial<Record<BrandKey, string>> = {
  minia: 'https://min.ia.br',
  artefinal: 'https://artefinal.app',
};

export function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'BigCorps',
    legalName: 'BigCorps Tecnologia Ltda',
    url: 'https://bigcorps.com.br',
    logo: {
      '@type': 'ImageObject',
      url: 'https://www.minhai.app/icons/icon-192x192.png',
      width: 192,
      height: 192,
    },
    foundingDate: '2023',
    foundingLocation: {
      '@type': 'Place',
      addressCountry: 'BR',
      addressLocality: 'São Paulo',
    },
    taxID: '14.282.244/0001-19',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+55-11-92682-8418',
        contactType: 'customer service',
        availableLanguage: 'Portuguese',
        areaServed: 'BR',
      },
      {
        '@type': 'ContactPoint',
        email: 'contato@bigcorps.com.br',
        contactType: 'customer support',
      },
    ],
    sameAs: [
      'https://www.instagram.com/bigcorps',
      'https://bigcorps.com.br',
      'https://minhai.app',
      'https://minhai.com.br',
      'https://conviteia.com',
      'https://min.ia.br',
      'https://pix.wiki',
      'https://consulta.tec.br',
    ],
  };
}

// ── Convite IA ───────────────────────────────────────────────────────────────

export function conviteiaGraph() {
  const base = SEO.conviteia.baseUrl;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${base}/#software`,
        name: 'Convite IA',
        alternateName: 'ConviteIA',
        url: base,
        description: SEO.conviteia.description,
        applicationCategory: 'LifestyleApplication',
        applicationSubCategory: 'Convite digital',
        operatingSystem: 'Web, Android',
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${SEO.minhai.baseUrl}/#software` },
        creator: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'BRL',
          lowPrice: '29.90',
          highPrice: '149.90',
          offerCount: '2',
          offers: [
            {
              '@type': 'Offer',
              name: 'Um convite',
              price: '29.90',
              priceCurrency: 'BRL',
              description:
                'Pagamento único de R$ 29,90 por convite. O convite publicado fica no ar para sempre, mesmo sem plano ativo.',
              availability: 'https://schema.org/InStock',
            },
            {
              '@type': 'Offer',
              name: 'Convites à vontade',
              price: '149.90',
              priceCurrency: 'BRL',
              description:
                'R$ 149,90 por mês para criar convites ilimitados enquanto o plano estiver ativo. Indicado para revendedores e conviteiras.',
              availability: 'https://schema.org/InStock',
            },
          ],
        },
        featureList: [
          'Assistente de criação em 10 etapas com prévia ao vivo',
          '11 tipos de evento: casamento, bodas de prata, bodas de ouro, noivado, chá de panela, debutante, aniversário, aniversário infantil, happy hour, confraternização e vaquinha',
          '15 seções ligáveis e reordenáveis',
          '10 temas de cor e 10 pares tipográficos validados em contraste WCAG',
          'Capa em envelope que abre com lacre de cera',
          'Música, contagem regressiva e botão de calendário',
          'Localização com mapa',
          'Confirmação de presença (RSVP) com painel para os anfitriões',
          'Mural de recados moderado',
          'Lista de presentes que recebe PIX de verdade, com saldo e saque',
          'Endereço próprio no formato seunome.conviteia.com',
          'Sugestão de frase, convocação, cores e fontes por IA',
          'Convite publicado permanece no ar mesmo após o cancelamento do plano',
        ],
        audience: {
          '@type': 'Audience',
          audienceType: [
            'Noivos', 'Aniversariantes', 'Mães de debutante',
            'Organizadores de eventos', 'Conviteiras', 'Revendedores de arte digital',
          ],
        },
      },

      {
        '@type': 'FAQPage',
        '@id': `${base}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Quanto custa um convite no Convite IA?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'R$ 29,90 por convite, em pagamento único, e o convite fica publicado para sempre. Quem cria muitos convites pode assinar o plano Convites à vontade por R$ 149,90 por mês, com convites ilimitados enquanto o plano estiver ativo.',
            },
          },
          {
            '@type': 'Question',
            name: 'O convite sai do ar se eu cancelar o plano?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. Convite publicado nunca é derrubado. O plano mensal vencido bloqueia apenas a criação de convites novos — quem tem o link é o convidado, não o cliente, e a página pública continua no ar.',
            },
          },
          {
            '@type': 'Question',
            name: 'Como funciona a lista de presentes?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Os convidados escolhem um presente da lista e pagam por PIX dentro do próprio convite. O valor entra como saldo dos anfitriões, que podem sacar quando quiserem. O Convite IA retém 1% do valor recebido.',
            },
          },
          {
            '@type': 'Question',
            name: 'Preciso pagar antes de ver o convite pronto?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. Você monta o convite inteiro no assistente e vê o resultado em tempo real sem criar conta. O cadastro e o pagamento só aparecem no fim, na hora de escolher o endereço e publicar.',
            },
          },
          {
            '@type': 'Question',
            name: 'Que tipos de evento o Convite IA cobre?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Casamento, bodas de prata, bodas de ouro, noivado, chá de panela, debutante, aniversário, aniversário infantil, happy hour, confraternização e vaquinha.',
            },
          },
        ],
      },

      {
        '@type': 'HowTo',
        '@id': `${base}/#howto`,
        name: 'Como criar um convite digital no Convite IA',
        description:
          'Monte um convite digital com confirmação de presença e lista de presentes, e publique em um endereço próprio.',
        totalTime: 'PT15M',
        estimatedCost: { '@type': 'MonetaryAmount', currency: 'BRL', value: '29.90' },
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Monte o convite no assistente',
            text: 'Responda as 10 etapas — tipo de evento, cores, nomes, data, local, fontes, mídia, seções e presentes — vendo o convite se montar ao lado em tempo real.',
            url: `${base}/convite/criar`,
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Escolha o endereço',
            text: 'Escolha um endereço próprio no formato seunome.conviteia.com, em vez de um link genérico com código.',
            url: `${base}/convite/criar`,
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Publique e compartilhe',
            text: 'Pague por PIX e publique. O convite entra no ar imediatamente, com confirmação de presença, mural de recados e lista de presentes ativos.',
            url: base,
          },
        ],
      },

      organizationNode(),

      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'Convite IA',
        description: SEO.conviteia.description,
        inLanguage: 'pt-BR',
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

// ── Pix Wiki ─────────────────────────────────────────────────────────────────

export function pixGraph() {
  const base = SEO.pix.baseUrl;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${base}/#software`,
        name: 'pix.wiki',
        alternateName: 'Pix Wiki',
        url: base,
        description: SEO.pix.description,
        applicationCategory: 'FinanceApplication',
        applicationSubCategory: 'Cobrança PIX',
        operatingSystem: 'Web, Android',
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${SEO.minhai.baseUrl}/#software` },
        creator: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'BRL',
          description:
            'Sem mensalidade e sem maquininha. A cobrança é gratuita; a taxa de 1% incide apenas no saque do valor recebido.',
          availability: 'https://schema.org/InStock',
        },
        featureList: [
          'Link de cobrança PIX com o nome do negócio: pix.wiki/seu-negocio',
          'QR Code personalizado',
          'Confirmação de pagamento direto no banco, sem depender de comprovante enviado pelo cliente',
          'Link com valor fixo: pix.wiki/seu-negocio/50',
          'Painel com saldo, recebimentos e saque',
          'Sem mensalidade — 1% apenas no saque',
          'Assistente com ativação por voz da minhAi incluso',
        ],
        audience: {
          '@type': 'BusinessAudience',
          audienceType: ['MEI', 'Autônomo', 'Pequena empresa', 'Loja física', 'Food truck'],
        },
      },

      {
        '@type': 'FAQPage',
        '@id': `${base}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Quanto custa o pix.wiki?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não há mensalidade nem custo por cobrança. A taxa é de 1% e incide apenas no momento do saque do valor recebido.',
            },
          },
          {
            '@type': 'Question',
            name: 'Como o pix.wiki evita comprovante falso?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A confirmação do pagamento vem do próprio banco, pela API do PIX, e não da imagem que o cliente envia. O sistema só marca como pago quando o valor cai na conta.',
            },
          },
          {
            '@type': 'Question',
            name: 'Preciso de maquininha?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. O pagamento acontece pelo link ou pelo QR Code, no celular do próprio cliente.',
            },
          },
        ],
      },

      organizationNode(),

      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'pix.wiki',
        description: SEO.pix.description,
        inLanguage: 'pt-BR',
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

// ── ConsultaTec ──────────────────────────────────────────────────────────────

export function melhoriaGraph() {
  const base = SEO.melhoria.baseUrl;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${base}/#software`,
        name: 'MelhorIA',
        alternateName: 'MelhorIA — a IA da Melhor Idade',
        url: base,
        description: SEO.melhoria.description,
        applicationCategory: 'HealthApplication',
        applicationSubCategory: 'Lembrete de medicação e agenda de saúde',
        operatingSystem: 'Web, Android',
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${SEO.minhai.baseUrl}/#software` },
        creator: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'BRL',
          description:
            'Cadastrar remédios, consultas e exames e receber os lembretes é grátis e ilimitado. Créditos só para a câmera com IA, conversa com IA e envio de SMS.',
          availability: 'https://schema.org/InStock',
        },
        featureList: [
          'Lembrete de remédio que funciona com o aplicativo fechado',
          'Confirmação de dose tomada e relatório de adesão para o médico',
          'Aviso quando o remédio está acabando',
          'Agenda de consultas e exames com alerta de preparo e jejum',
          'Verificação antifraude de boleto pela linha digitável, sem custo',
          'Lista de compras integrada ao estoque de medicamentos',
          'Botão de emergência que avisa a família',
          'Letra grande, botões grandes e ditado por microfone',
        ],
        audience: {
          '@type': 'PeopleAudience',
          suggestedMinAge: 60,
          audienceType: ['Pessoa idosa', 'Cuidador familiar', 'Filho que cuida dos pais'],
        },
      },

      {
        '@type': 'FAQPage',
        '@id': `${base}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'O lembrete funciona com o celular guardado no bolso?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sim. O horário fica guardado no servidor, não no aparelho. O aviso chega como notificação mesmo com o aplicativo fechado, e se ninguém confirmar em 30 minutos avisamos um familiar cadastrado.',
            },
          },
          {
            '@type': 'Question',
            name: 'Preciso pagar para usar a MelhorIA?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. Cadastrar remédios, consultas e exames e receber todos os lembretes é grátis e sem limite. Créditos só são usados para ler receita por foto, analisar imagem de boleto, conversar com a inteligência artificial e enviar SMS.',
            },
          },
          {
            '@type': 'Question',
            name: 'Como sei se um boleto é golpe?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Digite a linha digitável do boleto e a MelhorIA confere os dígitos verificadores, o banco emissor, o vencimento e o valor, sem custo nenhum. O aplicativo nunca diz que um boleto é seguro: quando nada de errado aparece, o aviso é de que não encontramos indícios, e a orientação é sempre confirmar por telefone com quem enviou.',
            },
          },
          {
            '@type': 'Question',
            name: 'O botão de emergência chama o SAMU?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. O botão avisa as pessoas que você cadastrou como contato de emergência, pelo aplicativo e por SMS. Ele não aciona 192, 190 ou 193. Em caso de urgência, ligue diretamente para esses números.',
            },
          },
          {
            '@type': 'Question',
            name: 'A MelhorIA dá orientação médica?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. A MelhorIA lembra, organiza e registra. Ela não indica dose, não diz para que serve um medicamento e não interpreta resultado de exame. Toda dúvida sobre tratamento é com o médico.',
            },
          },
        ],
      },
    ],
  };
}

export function consultatecGraph() {
  const base = SEO.consultatec.baseUrl;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${base}/#software`,
        name: 'ConsultaTec',
        url: base,
        description: SEO.consultatec.description,
        applicationCategory: 'BusinessApplication',
        applicationSubCategory: 'Consulta de dados cadastrais',
        operatingSystem: 'Web',
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${SEO.minhai.baseUrl}/#software` },
        creator: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'BRL',
          lowPrice: '3.00',
          offerCount: '1',
          description:
            'Consulta avulsa a partir de R$ 3,00, paga por PIX na hora. Sem assinatura e sem cadastro obrigatório.',
          availability: 'https://schema.org/InStock',
        },
        featureList: [
          'Identificação automática de CPF ou CNPJ pelo documento digitado',
          'Dados cadastrais a partir de R$ 3,00',
          'Restrições, score e protestos em cartório',
          'Pagamento por PIX na hora, sem cadastro',
          'Conta opcional com saldo para consultas seguintes',
          'Histórico de consultas',
        ],
        audience: {
          '@type': 'BusinessAudience',
          audienceType: [
            'Lojista', 'Imobiliária', 'Escritório de advocacia',
            'Empresa de crédito', 'Autônomo', 'Departamento de compras',
          ],
        },
      },

      {
        '@type': 'FAQPage',
        '@id': `${base}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Quanto custa uma consulta na ConsultaTec?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Os dados cadastrais começam em R$ 3,00. Cada tipo de consulta tem o preço exibido antes da compra, e o pagamento é feito por PIX na hora.',
            },
          },
          {
            '@type': 'Question',
            name: 'Preciso criar conta para consultar?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. Dá para pagar por PIX e receber o resultado sem cadastro. A conta é opcional e serve para deixar saldo e guardar o histórico das consultas.',
            },
          },
          {
            '@type': 'Question',
            name: 'Preciso saber se o documento é CPF ou CNPJ?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. Basta digitar o número: o sistema identifica sozinho se é CPF ou CNPJ e mostra as consultas disponíveis para aquele documento.',
            },
          },
        ],
      },

      organizationNode(),

      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'ConsultaTec',
        description: SEO.consultatec.description,
        inLanguage: 'pt-BR',
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

// ── min.IA e ArteFinal ───────────────────────────────────────────────────────
// Não há grafo aqui de propósito. O SoftwareApplication dessas duas marcas
// pertence à landing pública (min.ia.br e artefinal.app), que é indexável.
// Declarar o mesmo software também na ferramenta criaria duas entidades
// concorrentes para o mesmo produto.
