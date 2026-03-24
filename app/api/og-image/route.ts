import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        // User-Agent de bot para garantir que o YouTube retorne a OG tag
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      // Timeout de 5s para não travar o modal
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ error: 'fetch failed' }, { status: 502 });

    const html = await res.text();

    // Tenta og:image primeiro, depois twitter:image como fallback
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/);

    if (!match?.[1]) return NextResponse.json({ error: 'no og image found' }, { status: 404 });

    return NextResponse.json({ imageUrl: match[1] });
  } catch (err) {
    console.error('[og-image proxy] error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
