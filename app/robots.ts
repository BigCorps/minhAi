// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [

      // ── Crawlers de busca tradicionais ─────────────────────────────────────
      {
        userAgent: ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Yandex'],
        allow: '/',
        disallow: [
          '/dashboard/',
          '/ia/',          // assistentes de clientes — não indexar
          '/api/',
          '/vendas/',
          '/fila/',
          '/pix/',
          '/link/',
          '/login',
          '/cadastro',
          '/cliente/',
        ],
      },

      // ── Googlebot imagens — liberar para rich results ───────────────────────
      {
        userAgent: 'Googlebot-Image',
        allow: ['/icons/', '/og-image.png', '/dispositivos.png', '/api.png', '/vantagens.png', '/webapp.png'],
        disallow: '/dashboard/',
      },

      // ── Crawlers de IA — liberar conteúdo público para citação ─────────────
      // Estes bots indexam para ChatGPT, Claude, Perplexity, etc.
      {
        userAgent: [
          'GPTBot',            // OpenAI — ChatGPT training e search
          'OAI-SearchBot',     // OpenAI — ChatGPT search em tempo real
          'ClaudeBot',         // Anthropic — Claude
          'anthropic-ai',      // Anthropic — crawler alternativo
          'PerplexityBot',     // Perplexity AI
          'YouBot',            // You.com
          'cohere-ai',         // Cohere
          'Applebot',          // Apple Siri / Spotlight
          'Applebot-Extended', // Apple extended crawling
          'Google-Extended',   // Google Gemini training
          'CCBot',             // Common Crawl (base de vários LLMs)
          'Meta-ExternalAgent', // Meta AI
          'Bytespider',        // ByteDance / TikTok AI
        ],
              allow: [
        '/',
        '/precos',
        '/sobre',
        '/contato',
        '/docs',
        '/blog',
        '/para/',
        '/ia/suporte',   // ← demo pública — crawlers de IA podem indexar
      ],
      disallow: [
        '/dashboard/',
        '/ia/',          // bloqueia todo /ia/ exceto /ia/suporte acima
        '/api/',
        '/vendas/',
        '/fila/',
        '/pix/',
        '/link/',
        '/login',
        '/cadastro',
        '/cliente/',
      ],
      },

      // ── Scrapers comerciais — bloquear ──────────────────────────────────────
      {
        userAgent: [
          'SemrushBot',
          'SemrushBot-SA',
          'AhrefsBot',
          'MJ12bot',
          'DotBot',
          'BLEXBot',
          'PetalBot',
          'DataForSeoBot',
        ],
        disallow: '/',
      },
    ],

    sitemap: 'https://www.minhai.app/sitemap.xml',
    host: 'https://www.minhai.app',
  };
}
