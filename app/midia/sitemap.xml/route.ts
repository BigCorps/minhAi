import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const host = new URL(request.url).hostname.toLowerCase();
  const isRoot = host === 'midia.pro' || host === 'www.midia.pro';
  const urls = isRoot
    ? '<url><loc>https://midia.pro/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>'
    : '';

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
