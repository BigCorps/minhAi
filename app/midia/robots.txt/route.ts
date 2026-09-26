import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const host = new URL(request.url).hostname.toLowerCase();
  const isRoot = host === 'midia.pro' || host === 'www.midia.pro';

  const body = isRoot
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /dashboard',
        'Disallow: /login',
        'Disallow: /api/',
        '',
        'Sitemap: https://midia.pro/sitemap.xml',
        'Host: https://midia.pro',
        '',
      ].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
