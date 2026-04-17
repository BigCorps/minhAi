// app/sitemap.ts — versão atualizada com páginas de nicho
import { MetadataRoute } from 'next';
import { NICHO_PAGES } from './para/[slug]/data';

const BASE_URL = 'https://www.minhai.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

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
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/sobre`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contato`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/ia/suporte`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Páginas de nicho — geradas automaticamente a partir dos dados
  const paginasNicho: MetadataRoute.Sitemap = NICHO_PAGES.map((p) => ({
    url: `${BASE_URL}/para/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85, // Alta prioridade — são as páginas de conversão de cauda longa
  }));

  return [...paginasPrincipais, ...paginasNicho];
}
