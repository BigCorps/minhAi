// app/sitemap.ts — versão completa com todas as páginas
import { MetadataRoute } from 'next';
import { NICHO_PAGES } from './para/[slug]/data';

const BASE_URL = 'https://www.minhai.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // ── Páginas principais — alta prioridade ─────────────────────────────────
  const paginasPrincipais: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/precos`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/tour`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.90,
    },
    {
      url: `${BASE_URL}/sobre`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/contato`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.65,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.80,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/termos`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/exclusao`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // ── Demo pública — indexável por crawlers de IA ──────────────────────────
   const paginasDemo: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/ia/suporte`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.70,
    },
  ];

  // ── Páginas de nicho — SEO programático (cauda longa) ───────────────────
  const paginasNicho: MetadataRoute.Sitemap = NICHO_PAGES.map((p) => ({
    url: `${BASE_URL}/para/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.88,
  }));

  return [
    ...paginasPrincipais,
    ...paginasDemo,
    ...paginasNicho,
  ];
}
