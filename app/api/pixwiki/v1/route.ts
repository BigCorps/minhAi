import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store',
  };
}

function validPixWikiHost(req: NextRequest) {
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  return host === 'pix.wiki' || host === 'www.pix.wiki';
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  if (!validPixWikiHost(req)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const resource = req.nextUrl.searchParams.get('resource') || '/';
  const edgeUrl = new URL(`${SUPABASE_URL}/functions/v1/pixwiki-api`);
  edgeUrl.searchParams.set('resource', resource);

  // Repassa os filtros da API, mas não duplica o parâmetro interno "resource".
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== 'resource') edgeUrl.searchParams.append(key, value);
  });

  const authorization = req.headers.get('authorization') || '';
  const response = await fetch(edgeUrl, {
    method: 'GET',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      ...corsHeaders(),
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}
