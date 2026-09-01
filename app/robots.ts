// app/robots.ts
// ─────────────────────────────────────────────────────────────────────────────
// robots.txt por HOST.
//
// Antes, este arquivo era fixo na minhAi: conviteia.com/robots.txt anunciava
// `Sitemap: https://www.minhai.app/sitemap.xml` e `Host: www.minhai.app`.
// Agora cada domínio recebe as próprias regras, vindas de lib/seo.ts.
//
// Precisa de force-dynamic: sem isso o Next gera o robots.txt na build, com
// o host de quem buildou, e todos os domínios recebem o mesmo arquivo.
// ─────────────────────────────────────────────────────────────────────────────

import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// Crawlers de busca tradicionais.
const SEARCH_BOTS = ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Yandex'];

// Crawlers de IA — liberados de propósito: é o que faz a marca ser citada em
// ChatGPT, Claude, Perplexity e Gemini (GEO).
const AI_BOTS = [
  'GPTBot',             // OpenAI — treino e ChatGPT search
  'OAI-SearchBot',      // OpenAI — busca em tempo real
  'ChatGPT-User',       // OpenAI — navegação a pedido do usuário
  'ClaudeBot',          // Anthropic
  'anthropic-ai',       // Anthropic — crawler alternativo
  'Claude-User',        // Anthropic — navegação a pedido do usuário
  'PerplexityBot',      // Perplexity
  'Perplexity-User',    // Perplexity — navegação a pedido do usuário
  'YouBot',             // You.com
  'cohere-ai',          // Cohere
  'Applebot',           // Apple Siri / Spotlight
  'Applebot-Extended',  // Apple — treino
  'Google-Extended',    // Google Gemini — treino
  'CCBot',              // Common Crawl
  'Meta-ExternalAgent', // Meta AI
  'Bytespider',         // ByteDance
];

// Scrapers comerciais de SEO — bloqueados: consomem banda e não trazem visita.
const SCRAPER_BOTS = [
  'SemrushBot', 'SemrushBot-SA', 'AhrefsBot', 'MJ12bot',
  'DotBot', 'BLEXBot', 'PetalBot', 'DataForSeoBot',
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { seo, brand, clientPage } = resolveSeo(host);

  // ── Página de cliente (slug.minhai.app, slug.conviteia.com) ────────────────
  // Conteúdo de terceiro: assistente de uma empresa ou convite de uma família.
  // Nada disso entra em índice de busca.
  if (clientPage) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  const rules: MetadataRoute.Robots['rules'] = [
    {
      userAgent: SEARCH_BOTS,
      allow: '/',
      disallow: seo.disallow,
    },
    {
      userAgent: AI_BOTS,
      allow: seo.aiAllow.length > 0 ? seo.aiAllow : '/',
      disallow: seo.disallow,
    },
    {
      userAgent: SCRAPER_BOTS,
      disallow: '/',
    },
    // Qualquer outro robô: mesma regra dos buscadores. Sem esta entrada,
    // um crawler fora das listas acima não encontra regra aplicável e
    // assume liberado em tudo, inclusive /dashboard.
    {
      userAgent: '*',
      allow: '/',
      disallow: seo.disallow,
    },
  ];

  // Googlebot-Image só faz sentido onde existem imagens de rich result.
  if (brand === 'minhai') {
    rules.splice(1, 0, {
      userAgent: 'Googlebot-Image',
      allow: [
        '/icons/',
        '/og-image.png',
        '/dispositivos.png',
        '/api.png',
        '/vantagens.png',
        '/webapp.png',
      ],
      disallow: '/dashboard/',
    });
  }

  return {
    rules,
    sitemap: `${seo.baseUrl}/sitemap.xml`,
    host: seo.baseUrl,
  };
}
