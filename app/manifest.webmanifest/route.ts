// app/manifest.webmanifest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // Slug pode vir via query param (rewrite do middleware) ou via hostname
  const slugFromQuery = request.nextUrl.searchParams.get('slug');
  const slugFromHost = hostname.endsWith('.minhai.com.br') && !hostname.startsWith('www.')
    ? hostname.replace('.minhai.com.br', '')
    : hostname.endsWith('.minhai.app') && !hostname.startsWith('www.')
    ? hostname.replace('.minhai.app', '')
    : null;

  const slug = slugFromQuery || slugFromHost;

  // Manifest padrão eAi (sem subdomínio)
  if (!slug) {
    return NextResponse.json({
      name: 'minhAi',
      short_name: 'minhAi',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#f97316',
      icons: [
    { src: 'https://www.minhai.app/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'https://www.minhai.app/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
    }, {
      headers: { 'Content-Type': 'application/manifest+json' }
    });
  }

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from('companies')
    .select('name, webapp_logo_url, webapp_theme_color')
    .eq('slug', slug)
    .single();

  return NextResponse.json({
    // 1. Coloque o nome da empresa primeiro no 'name' (ou deixe apenas company.name)
    name: company?.name ? `${company.name} - minhAi` : 'minhAi', 
    
    // 2. Inverta a ordem lógica do 'short_name' para priorizar a empresa
    short_name: company?.name || 'minhAi', 
    
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: company?.webapp_theme_color || '#f97316',
    icons: company?.webapp_logo_url
      ? [
          {
            src: company.webapp_logo_url,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: company.webapp_logo_url,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ]
      : [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
  }, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
