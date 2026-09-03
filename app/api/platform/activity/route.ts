import { NextResponse } from 'next/server';

import { recordPlatformActivity } from '@/lib/platform-activity-server';
import {
  normalizePlatformHostname,
  resolvePlatformApp,
  sanitizePlatformPath,
  type PlatformActivityKind,
} from '@/lib/platform-products';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_KINDS = new Set<PlatformActivityKind>([
  'pageview',
  'heartbeat',
  'login',
]);

const MAX_BODY_BYTES = 4_096;

function requestHostname(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-host');
  const host = forwarded || request.headers.get('host') || '';
  return normalizePlatformHostname(host);
}

function pathFromSameOriginReferer(
  request: Request,
  hostname: string,
): string | null {
  const referer = request.headers.get('referer');
  if (!referer) return null;

  try {
    const url = new URL(referer);
    if (normalizePlatformHostname(url.hostname) !== hostname) return null;
    return sanitizePlatformPath(url.pathname);
  } catch {
    return null;
  }
}

function hasAcceptableOrigin(
  request: Request,
  hostname: string,
): boolean {
  const origin = request.headers.get('origin');

  // Alguns navegadores/ambientes podem omitir Origin em same-origin.
  // Quando ele existe, porém, precisa apontar para o mesmo host.
  if (!origin) return true;

  try {
    const url = new URL(origin);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }

    return normalizePlatformHostname(url.hostname) === hostname;
  } catch {
    return false;
  }
}

function noContent() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(request: Request) {
  const hostname = requestHostname(request);

  if (!hasAcceptableOrigin(request, hostname)) {
    return noContent();
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return noContent();
  }

  const contentLength = Number.parseInt(
    request.headers.get('content-length') ?? '0',
    10,
  );

  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new NextResponse(null, {
      status: 413,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  let body: {
    kind?: PlatformActivityKind;
    path?: string;
    activeSecondsDelta?: number;
  } = {};

  try {
    body = await request.json();
  } catch {
    return noContent();
  }

  const kind =
    body.kind && ALLOWED_KINDS.has(body.kind)
      ? body.kind
      : 'heartbeat';

  // Preferimos o Referer same-origin, pois ele representa a página real que
  // originou a chamada. O path enviado pelo cliente é apenas fallback.
  const pathname =
    pathFromSameOriginReferer(request, hostname) ??
    sanitizePlatformPath(body.path);

  const appKey = resolvePlatformApp(hostname, pathname);

  if (!appKey) {
    return noContent();
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Telemetria first-party é exclusiva de usuários autenticados.
  if (authError || !user) {
    return noContent();
  }

  try {
    await recordPlatformActivity({
      user,
      appKey,
      kind,
      pathname,
      hostname,
      activeSecondsDelta:
        kind === 'heartbeat' ? body.activeSecondsDelta : 0,
    });

    return noContent();
  } catch (error) {
    console.error('[platform-activity] Falha ao registrar atividade:', error);

    // A telemetria nunca bloqueia o produto. Mantemos resposta simples, sem
    // detalhes do banco ou da função RPC.
    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  }
}
