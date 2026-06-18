// app/.well-known/assetlinks.json/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Entrada padrão: o app já publicado e aprovado na Play Store (app.minhai.www.twa).
// Preservada exatamente como estava em public/.well-known/assetlinks.json.
const MINHAI_DEFAULT_ENTRY = [
  {
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ],
    target: {
      namespace: 'android_app',
      package_name: 'app.minhai.www.twa',
      sha256_cert_fingerprints: [
        '70:B8:A4:A0:21:48:2B:30:A2:23:20:88:BB:39:0F:12:EB:8B:3B:6E:72:24:28:A7:7C:4B:67:8F:FB:37:D8:D7',
        'DD:8F:9E:B8:B6:06:96:EA:78:F3:85:41:11:8C:21:0A:FE:70:38:40:DF:E8:C3:BD:22:46:C1:C9:B6:C3:6A:EB',
      ],
    },
  },
];

const ASSETLINKS_BY_HOST: Record<string, any[]> = {
  'ia.artefinal.app': [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.artefinal.app', // confirmar o package real do TWA do ArteFinal
        sha256_cert_fingerprints: [
          'FINGERPRINT_DO_KEYSTORE_ARTEFINAL_AQUI',
        ],
      },
    },
  ],
  // próximo produto whitelabel entra aqui, com sua própria chave de host
};

export async function GET(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();

  // Host específico mapeado (ex: ia.artefinal.app) → usa a entrada dele.
  // Qualquer outro host (minhai.app, www.minhai.app, subdomínios de cliente, etc.)
  // → mantém o comportamento atual: entrada padrão da minhAi.
  const entries = ASSETLINKS_BY_HOST[host] ?? MINHAI_DEFAULT_ENTRY;

  return NextResponse.json(entries, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}