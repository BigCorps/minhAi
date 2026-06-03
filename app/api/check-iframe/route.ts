// app/api/check-iframe/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ compatible: false, reason: 'URL não informada' }, { status: 400 });
  }

  // Garantir que tem protocolo
  const targetUrl = url.startsWith('http') ? url : `https://${url}`;

// Verificar se o site usa HTTPS
if (!targetUrl.startsWith('https://')) {
  return NextResponse.json({
    compatible: false,
    reason: 'O site usa HTTP (não seguro). Apenas sites com HTTPS podem ser exibidos dentro do WebApp.',
  });
}

  try {
    const response = await fetch(targetUrl, {
      method: 'HEAD', // só queremos os headers, não o body
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; minhAi-bot/1.0)',
      },
    });

    const xFrameOptions = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');

    // Verificar X-Frame-Options
    if (xFrameOptions) {
      const val = xFrameOptions.toUpperCase().trim();
      if (val === 'DENY') {
        return NextResponse.json({
          compatible: false,
          reason: 'O site bloqueia completamente o uso em iframe (X-Frame-Options: DENY).',
          header: `X-Frame-Options: ${xFrameOptions}`,
        });
      }
      if (val === 'SAMEORIGIN') {
        return NextResponse.json({
          compatible: false,
          reason: 'O site só permite iframe no mesmo domínio (X-Frame-Options: SAMEORIGIN).',
          header: `X-Frame-Options: ${xFrameOptions}`,
        });
      }
    }

    // Verificar Content-Security-Policy frame-ancestors
    if (csp) {
      const frameAncestors = csp
        .split(';')
        .map(d => d.trim())
        .find(d => d.startsWith('frame-ancestors'));

      if (frameAncestors) {
        const value = frameAncestors.replace('frame-ancestors', '').trim();
        if (value === "'none'") {
          return NextResponse.json({
            compatible: false,
            reason: "O site bloqueia iframe via Content-Security-Policy (frame-ancestors: 'none').",
            header: `CSP: ${frameAncestors}`,
          });
        }
        if (!value.includes('*') && !value.includes("'self'")) {
          return NextResponse.json({
            compatible: false,
            reason: 'O site restringe iframe a domínios específicos via Content-Security-Policy.',
            header: `CSP: ${frameAncestors}`,
          });
        }
      }
    }

    // Sem bloqueios detectados
    return NextResponse.json({
      compatible: true,
      reason: 'Site compatível com iframe.',
      status: response.status,
    });

  } catch (err: any) {
    // Timeout ou site fora do ar
    if (err?.name === 'TimeoutError' || err?.message?.includes('timeout')) {
      return NextResponse.json({
        compatible: false,
        reason: 'O site demorou muito para responder (timeout de 6s).',
      });
    }

    // Alguns sites bloqueiam HEAD mas aceitam GET — tentar GET como fallback
    try {
      const response2 = await fetch(targetUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(6000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; minhAi-bot/1.0)',
        },
      });

      const xfo = response2.headers.get('x-frame-options');
      if (xfo && ['DENY', 'SAMEORIGIN'].includes(xfo.toUpperCase().trim())) {
        return NextResponse.json({
          compatible: false,
          reason: `Site bloqueia iframe (${xfo}).`,
          header: `X-Frame-Options: ${xfo}`,
        });
      }

      return NextResponse.json({
        compatible: true,
        reason: 'Site provavelmente compatível com iframe.',
        status: response2.status,
      });

    } catch {
      return NextResponse.json({
        compatible: false,
        reason: 'Não foi possível acessar o site. Verifique se a URL está correta.',
      });
    }
  }
}
