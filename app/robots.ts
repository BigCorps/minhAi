import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { resolveSeo } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const SEARCH_BOTS = ['Googlebot', 'Bingbot', 'Slurp', 'DuckDuckBot', 'Yandex'];
const AI_BOTS = ['GPTBot','OAI-SearchBot','ChatGPT-User','ClaudeBot','anthropic-ai','Claude-User','PerplexityBot','Perplexity-User','YouBot','cohere-ai','Applebot','Applebot-Extended','Google-Extended','CCBot','Meta-ExternalAgent','Bytespider'];
const SCRAPER_BOTS = ['SemrushBot','SemrushBot-SA','AhrefsBot','MJ12bot','DotBot','BLEXBot','PetalBot','DataForSeoBot'];

function cleanHost(host: string) { return host.split(':')[0].toLowerCase(); }

export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = cleanHost(h.get('host') || '');

  // Páginas de cobrança de clientes nunca entram em índice.
  if (host.endsWith('.pix.wiki') && host !== 'www.pix.wiki') {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  if (host === 'pix.wiki' || host === 'www.pix.wiki') {
    const disallow = ['/api/','/auth/','/dashboard','/login','/onboarding','/c/','/caixa','/equipe','/pix/dashboard','/pix/login'];
    const allow = ['/', '/calculadora', '/docs', '/seguranca'];
    return {
      rules: [
        { userAgent: SEARCH_BOTS, allow, disallow },
        { userAgent: AI_BOTS, allow, disallow },
        { userAgent: SCRAPER_BOTS, disallow: '/' },
        { userAgent: '*', allow, disallow },
      ],
      sitemap: 'https://pix.wiki/sitemap.xml',
      host: 'https://pix.wiki',
    };
  }

  const { seo, brand, clientPage } = resolveSeo(host);
  if (clientPage) return { rules: [{ userAgent: '*', disallow: '/' }] };
  const rules: MetadataRoute.Robots['rules'] = [
    { userAgent: SEARCH_BOTS, allow: '/', disallow: seo.disallow },
    { userAgent: AI_BOTS, allow: seo.aiAllow.length > 0 ? seo.aiAllow : '/', disallow: seo.disallow },
    { userAgent: SCRAPER_BOTS, disallow: '/' },
    { userAgent: '*', allow: '/', disallow: seo.disallow },
  ];
  if (brand === 'minhai') rules.splice(1, 0, { userAgent: 'Googlebot-Image', allow: ['/icons/','/og-image.png','/dispositivos.png','/api.png','/vantagens.png','/webapp.png'], disallow: '/dashboard/' });
  return { rules, sitemap: `${seo.baseUrl}/sitemap.xml`, host: seo.baseUrl };
}
