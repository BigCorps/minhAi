// app/manifest.webmanifest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const ARTEFINAL_DOMAINS = ['ia.artefinal.app'];

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();

  // ── Manifest próprio do ArteFinal.app ─────────────────────────────────────
  if (ARTEFINAL_DOMAINS.includes(hostname)) {
    return NextResponse.json({
      name: 'ArteFinal.app',
      short_name: 'ArteFinal',
      description: 'Sua arte pronta para impressão com IA.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons: [
        {
          src: '/brands/artefinal/favicon.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/brands/artefinal/favicon.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    }, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Slug pode vir via query param (rewrite do middleware) ou via hostname
  const slugFromQuery = request.nextUrl.searchParams.get('slug');

  const MINHAI_DOMAINS = [
    '.minhai.app',
    '.minhai.com.br',
    '.minhaia.app',
    '.nossaia.app',
    '.suaia.app',
  ];

  const matchedDomain = MINHAI_DOMAINS.find(d =>
    hostname.endsWith(d) && !hostname.startsWith('www.')
  );

  const slugFromHost = matchedDomain ? hostname.replace(matchedDomain, '') : null;

  const slug = slugFromQuery || slugFromHost;

  // Manifest padrão minhAi (sem subdomínio)
  if (!slug) {
    return NextResponse.json({
      name: 'minhAi',
      short_name: 'minhAi',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#f97316',
      icons: [
        {
          src: 'https://www.minhai.app/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'https://www.minhai.app/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    }, {
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    });
  }

  const supabase = createAdminClient();

  const { data: company } = await supabase
    .from('companies')
    .select('name, webapp_logo_url, webapp_theme_color, webapp_domain')
    .eq('slug', slug)
    .single();

  // start_url absoluto com o domínio ATUAL configurado — evita PWA "presa" no domínio antigo
  const activeDomain = company?.webapp_domain || 'minhai.app';
  const absoluteStartUrl = `https://${slug}.${activeDomain}/?source=pwa`;

  return NextResponse.json({
    id: absoluteStartUrl,
    name: company?.name ? `${company.name} - minhAi` : 'minhAi',
    short_name: company?.name || 'minhAi',
    start_url: absoluteStartUrl,
    scope: `https://${slug}.${activeDomain}/`,
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: company?.webapp_theme_color || '#f97316',
    icons: company?.webapp_logo_url
      ? [
          {
            src: `${company.webapp_logo_url}?v=${Date.now()}`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: `${company.webapp_logo_url}?v=${Date.now()}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ]
      : [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
  }, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
