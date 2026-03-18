import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isSubdomain = hostname.endsWith('.minhai.com.br') && !hostname.startsWith('www.');
  const slug = isSubdomain ? hostname.replace('.minhai.com.br', '') : null;

  if (!slug) {
    return NextResponse.json({
      name: 'minhAi',
      short_name: 'minhAi',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#f97316',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    }, { headers: { 'Content-Type': 'application/manifest+json' } });
  }

  const supabase = createAdminClient();
  const { data: company } = await supabase
    .from('companies')
    .select('name, logo_url, webapp_theme_color')
    .eq('slug', slug)
    .single();

  return NextResponse.json({
    name: company?.name || 'minhAi',
    short_name: company?.name || 'minhAi',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: company?.webapp_theme_color || '#f97316',
    icons: company?.logo_url
      ? [
          { src: `/_next/image?url=${encodeURIComponent(company.logo_url)}&w=192&q=90`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: `/_next/image?url=${encodeURIComponent(company.logo_url)}&w=512&q=90`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ]
      : [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
  }, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    }
  });
}
