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
    llmsTxt: '/brands/minia/llms.txt',
    disallow: ['/'],
    aiAllow: [],
    sitemap: [],
  },

  // ── ArteFinal ──────────────────────────────────────────────────────────────
  artefinal: {
    key: 'artefinal',
    baseUrl: 'https://ia.artefinal.app',
    siteName: 'ArteFinal.app',
    title: 'ArteFinal.app — Seu arte-finalista com IA',
    description:
      'Fechamento de arquivo com sangria, faca de recorte, vetorização e PDF/X-1a em CMYK ISO Coated v2. Ferramenta para gráficas, papelarias e designers.',
    ogImage: '/brands/artefinal/og.png',
    ogImageAlt: 'ArteFinal.app — seu arte-finalista com IA',
    favicon: '/brands/artefinal/favicon.png',
    appleIcon: '/brands/artefinal/apple-touch-icon.png',
    manifest: '/brands/artefinal/manifest.webmanifest',
    llmsTxt: '/brands/artefinal/llms.txt',
    disallow: ['/'],
    aiAllow: [],
    sitemap: [],
  },

  // ── PixWiki ────────────────────────────────────────────────────────────────
  // Fonte central do modelo comercial atual. Não reintroduzir saldo/saque ou
  // porcentagem por Pix: o dinheiro entra diretamente na conta Mercado Pago.
  pix: {
    key: 'pix',
    baseUrl: 'https://pix.wiki',
    siteName: 'PixWiki',
    title: 'PixWiki — Confirmação automática de Pix com Mercado Pago',
    description:
      'Receba Pix pela sua chave ou Pix Link e acompanhe as confirmações automaticamente. Painel em tempo real, avisos por e-mail e Push, WhatsApp, multiempresa e relatórios. Comece grátis.',
    ogImage: '/brands/pix/og.png',
    ogImageAlt: 'PixWiki — confirmação automática de Pix com Mercado Pago',
    favicon: '/brands/pix/favicon.png',
    appleIcon: '/brands/pix/apple-touch-icon.png',
    manifest: '/brands/pix/manifest.webmanifest',
    llmsTxt: '/brands/pix/llms.txt',
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
  consultatec: {
    key: 'consultatec',
    baseUrl: 'https://consulta.tec.br',
    siteName: 'ConsultaTec',
    title: 'ConsultaTec — Consulta de CPF e CNPJ sem burocracia',
    description:
      'Digite o documento: o sistema identifica se é CPF ou CNPJ e mostra as consultas disponíveis com o preço de cada uma. A partir de R$ 3,00, pago por Pix, sem assinatura.',
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
  host: string;
  clientPage: boolean;
}

export function resolveSeo(host: string): ResolvedSeo {
  const h = cleanHost(host);
  const clientPage = isClientSubdomain(h);

  const brand: BrandKey = clientPage
    ? (h.endsWith('.conviteia.com') ? 'conviteia' : 'minhai')
    : getBrandByHost(h);

  return { brand, seo: SEO[brand], host: h, clientPage };
}

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

export interface BuildMetadataOptions {
  host: string;
  path?: string;
  title?: string;
  description?: string;
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

const ORG_ID = 'https://bigcorps.com.br/#organization';

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

// ── PixWiki ──────────────────────────────────────────────────────────────────

export function pixGraph() {
  const base = SEO.pix.baseUrl;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${base}/#software`,
        name: 'PixWiki',
        alternateName: ['pix.wiki', 'Pix Wiki'],
        url: base,
        description: SEO.pix.description,
        applicationCategory: 'FinanceApplication',
        applicationSubCategory: 'Confirmação e acompanhamento de recebimentos Pix',
        operatingSystem: 'Web',
        inLanguage: 'pt-BR',
        isAccessibleForFree: true,
        creator: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        offers: [
          {
            '@type': 'Offer',
            name: 'Pix Grátis',
            price: '0',
            priceCurrency: 'BRL',
            description: 'Confirmação automática, painel de recebimentos, histórico, e-mail e Push.',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Pix Link',
            price: '29.90',
            priceCurrency: 'BRL',
            description: 'Tudo do Pix Grátis, mais endereço próprio em pix.wiki, página de cobrança, link com valor e QR Code.',
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Pix Pro',
            price: '99.90',
            priceCurrency: 'BRL',
            description: 'Tudo do Pix Link, mais WhatsApp, multiempresa, relatórios, exportação e integrações com outros sistemas.',
            availability: 'https://schema.org/InStock',
          },
        ],
        featureList: [
          'Acompanhamento automático de recebimentos Pix em conta Mercado Pago conectada',
          'Chave Pix no plano gratuito',
          'Painel com atualização em tempo real e atualização manual sob demanda',
          'Histórico com o valor que efetivamente entrou na conta',
          'Avisos por e-mail e Web Push',
          'Pix Link com endereço no formato seunome.pix.wiki',
          'Link com valor preenchido e QR Code',
          'Avisos por WhatsApp no Pix Pro',
          'Várias empresas na mesma conta no Pix Pro',
          'Relatórios e exportação no Pix Pro',
          'Integrações por API e Webhooks no Pix Pro',
          'WebApp instalável no celular',
        ],
        audience: {
          '@type': 'Audience',
          audienceType: ['Pessoa física', 'Autônomo', 'MEI', 'Prestador de serviços', 'Loja', 'Pequena empresa'],
          geographicArea: { '@type': 'Country', name: 'Brasil' },
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${base}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'O dinheiro fica no PixWiki?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. O dinheiro continua entrando diretamente na conta Mercado Pago do recebedor. O PixWiki acompanha os recebimentos e organiza as confirmações.',
            },
          },
          {
            '@type': 'Question',
            name: 'O PixWiki cobra uma porcentagem de cada Pix?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. O PixWiki não cobra percentual por transação. Eventuais tarifas do Mercado Pago dependem do tipo de recebimento utilizado, e o painel mostra o valor que efetivamente entrou.',
            },
          },
          {
            '@type': 'Question',
            name: 'Posso usar o PixWiki como pessoa física?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Sim. O PixWiki pode ser usado por pessoa física, autônomo, MEI ou empresa que receba Pix em uma conta Mercado Pago compatível.',
            },
          },
          {
            '@type': 'Question',
            name: 'O cliente precisa instalar o PixWiki?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Não. O cliente paga pelo aplicativo do próprio banco. No Pix Link, basta abrir a página de cobrança e usar o QR Code ou o código Pix.',
            },
          },
          {
            '@type': 'Question',
            name: 'Como recebo aviso de um novo Pix?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'O painel atualiza automaticamente. E-mail e Push estão disponíveis desde o Pix Grátis; avisos por WhatsApp fazem parte do Pix Pro.',
            },
          },
          {
            '@type': 'Question',
            name: 'Qual a diferença entre Chave Pix e Pix Link?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Na Chave Pix o cliente informa a chave e o valor no banco. No Pix Link o recebedor envia uma página profissional com nome, QR Code e, se desejar, o valor já preenchido.',
            },
          },
        ],
      },
      organizationNode(),
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: 'PixWiki',
        alternateName: 'pix.wiki',
        description: SEO.pix.description,
        inLanguage: 'pt-BR',
        publisher: { '@id': ORG_ID },
      },
    ],
  };
}

// ── ConsultaTec ──────────────────────────────────────────────────────────────

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

// min.IA e ArteFinal não declaram grafo neste projeto: suas landings públicas
// vivem em projetos separados.
