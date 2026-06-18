// app/.well-known/assetlinks.json/route.ts
import { NextRequest, NextResponse } from 'next/server';

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
  const entries = ASSETLINKS_BY_HOST[host] || [];
  return NextResponse.json(entries, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
