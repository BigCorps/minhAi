import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { resolveSeo } from '@/lib/seo';
import { NICHO_PAGES } from './para/[slug]/data';

export const dynamic = 'force-dynamic';

function cleanHost(host: string) { return host.split(':')[0].toLowerCase(); }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = cleanHost(h.get('host') || '');
  const now = new Date();

  if (host.endsWith('.pix.wiki') && host !== 'www.pix.wiki') return [];
  if (host === 'pix.wiki' || host === 'www.pix.wiki') {
    return [
      { url: 'https://pix.wiki', lastModified: now, changeFrequency: 'weekly', priority: 1 },
      { url: 'https://pix.wiki/calculadora', lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
      { url: 'https://pix.wiki/docs', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
      { url: 'https://pix.wiki/seguranca', lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    ];
  }

  const resolved = resolveSeo(host);
  const { seo, brand, clientPage } = resolved;
  if (clientPage) return [];
  const paginas: MetadataRoute.Sitemap = seo.sitemap.map((entry) => ({ url: entry.path === '/' ? seo.baseUrl : `${seo.baseUrl}${entry.path}`, lastModified: now, changeFrequency: entry.changeFrequency, priority: entry.priority }));
  if (brand === 'minhai') return [...paginas, ...NICHO_PAGES.map((p) => ({ url: `${seo.baseUrl}/para/${p.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.88 }))];
  return paginas;
}
