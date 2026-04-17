// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── Crawlers de busca tradicionais ──────────────────────────────────────
      {
        userAgent: ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot'],
        allow: '/',
        disallow: [
          '/dashboard/',
          '/ia/',
          '/api/',
          '/vendas/',
          '/fila/',
          '/pix/',
          '/login',
          '/cadastro',
        ],
      },

      // ── Crawlers de IA — liberar conteúdo público ────────────────────────────
      {
        userAgent: [
          'OAI-SearchBot',   // ChatGPT / OpenAI
          'GPTBot',          // OpenAI training
          'ClaudeBot',       // Anthropic
          'PerplexityBot',   // Perplexity
          'YouBot',          // You.com
          'cohere-ai',       // Cohere
          'Applebot',        // Apple Siri / Spotlight
        ],
        allow: [
          '/',
          '/sobre',
          '/precos',
          '/contato',
          '/docs',
          '/blog',
        ],
        disallow: [
          '/dashboard/',
          '/ia/',
          '/api/',
          '/vendas/',
          '/fila/',
          '/pix/',
          '/login',
          '/cadastro',
        ],
      },

      // ── Bloquear scrapers comerciais não autorizados ─────────────────────────
      {
        userAgent: ['SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot', 'BLEXBot'],
        disallow: '/',
      },
    ],
    sitemap: 'https://www.minhai.app/sitemap.xml',
    host: 'https://www.minhai.app',
  };
}
