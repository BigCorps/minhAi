// app/sitemap.ts
// ─────────────────────────────────────────────────────────────────────────────
// sitemap.xml por HOST.
//
// Antes, o BASE_URL era fixo: conviteia.com/sitemap.xml devolvia uma lista de
// URLs de www.minhai.app. Sitemap com URLs de outro domínio o Google
// simplesmente descarta — na prática, os domínios novos estavam sem sitemap.
//
// A lista de páginas de cada marca mora em lib/seo.ts. A exceção é a cauda
// longa da minhAi (/para/[slug]), que é gerada de NICHO_PAGES e por isso é
// montada aqui.
// ─────────────────────────────────────────────────────────────────────────────

import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { resolveSeo } from '@/lib/seo';
import { NICHO_PAGES } from './para/[slug]/data';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const { seo, brand, clientPage } = resolveSeo(host);
  const now = new Date();

  // Página de cliente não tem sitemap: o robots.txt já bloqueia tudo.
  if (clientPage) return [];

  const paginas: MetadataRoute.Sitemap = seo.sitemap.map((entry) => ({
    url: entry.path === '/' ? seo.baseUrl : `${seo.baseUrl}${entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  // ── Cauda longa da minhAi — SEO programático ──────────────────────────────
  if (brand === 'minhai') {
    const paginasNicho: MetadataRoute.Sitemap = NICHO_PAGES.map((p) => ({
      url: `${seo.baseUrl}/para/${p.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.88,
    }));

    return [...paginas, ...paginasNicho];
  }

  return paginas;
}
