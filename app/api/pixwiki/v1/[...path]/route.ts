import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

type RouteContext = { params: Promise<{ path: string[] }> };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Expose-Headers': 'X-Request-Id, X-PixWiki-Version',
    'Cache-Control': 'no-store',
  };
}

function validPixWikiHost(req: NextRequest) {
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  return host === 'pix.wiki' || host === 'www.pix.wiki';
}

async function proxy(req: NextRequest, ctx: RouteContext) {
  if (!validPixWikiHost(req)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { path } = await ctx.params;
  const resource = `/${(path || []).join('/')}`;
  const edgeUrl = new URL(`${SUPABASE_URL}/functions/v1/pixwiki-api`);
  edgeUrl.searchParams.set('resource', resource);
  req.nextUrl.searchParams.forEach((value, key) => edgeUrl.searchParams.append(key, value));

  const headers: Record<string, string> = {
    Authorization: req.headers.get('authorization') || '',
    Accept: 'application/json',
  };
  const contentType = req.headers.get('content-type');
  const idempotencyKey = req.headers.get('idempotency-key');
  if (contentType) headers['Content-Type'] = contentType;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(edgeUrl, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
    cache: 'no-store',
  });

  const outHeaders: Record<string, string> = {
    ...corsHeaders(),
    'Content-Type': response.headers.get('content-type') || 'application/json',
  };
  const requestId = response.headers.get('x-request-id');
  const version = response.headers.get('x-pixwiki-version');
  if (requestId) outHeaders['X-Request-Id'] = requestId;
  if (version) outHeaders['X-PixWiki-Version'] = version;

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: outHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}
