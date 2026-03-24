import { NextRequest, NextResponse } from 'next/server';

function normalizeUrl(raw: string): string {
  let url = raw.trim();

  // Remove tudo até o @ se vier só o handle (ex: "@tecmundo" → youtube.com/@tecmundo)
  if (url.startsWith('@')) {
    return `https://www.youtube.com/${url}`;
  }

  // Adiciona https:// se não tiver protocolo
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Valida que é uma URL real
  try {
    new URL(url);
    return url;
  } catch {
    return '';
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') ?? '';

  if (!raw) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  const url = normalizeUrl(raw);

  if (!url) return NextResponse.json({ error: 'invalid url' }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 });
    }

    const html = await res.text();

    // og:image em qualquer ordem de atributos
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/);

    if (!match?.[1]) {
      return NextResponse.json({ error: 'no og image found' }, { status: 404 });
    }

    return NextResponse.json({ imageUrl: match[1] });
  } catch (err) {
    console.error('[og-image proxy] error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
