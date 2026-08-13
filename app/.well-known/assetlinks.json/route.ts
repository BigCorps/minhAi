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
          'DA:46:AE:F5:3E:53:A7:58:F1:8D:DE:3C:92:8A:BF:7B:D1:30:35:6F:DC:BD:5A:7A:2D:A7:D9:6B:58:37:62:72',
        ],
      },
    },
  ],
  'app.min.ia.br': [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.minia.app',
        sha256_cert_fingerprints: [
          '48:65:D5:46:E5:C4:C9:E7:1F:2D:C1:BF:6E:AB:38:D9:94:46:16:07:E5:65:E2:3D:DA:60:17:F7:3E:7A:B6:6D',
        ],
      },
    },
  ],

  // ───────────────────────────────────────────────────────────────────────────
  // NOVOS TWAs (Conviteia / ConsultaTec / Pix Wiki)
  //
  // Enquanto `sha256_cert_fingerprints` estiver vazio, a entrada é IGNORADA e o
  // host continua recebendo MINHAI_DEFAULT_ENTRY — ou seja, o comportamento é
  // exatamente o de hoje. Nada muda ao subir este arquivo.
  //
  // O fingerprint definitivo só existe DEPOIS do primeiro upload do .aab no
  // Play Console, em: Versão > Configuração > Integridade do app >
  // Assinatura de apps do Google Play > "Certificado de assinatura do app"
  // (SHA-256). Cole aqui, faça deploy, e a verificação passa a valer.
  //
  // Se você também assina localmente com chave de upload, adicione o SHA-256 do
  // "Certificado de chave de upload" da mesma tela como SEGUNDO fingerprint —
  // é o que permite testar o .aab/.apk assinado localmente sem barra de URL.
  // ───────────────────────────────────────────────────────────────────────────
  'conviteia.com': [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.conviteia.twa', // TRAVAR antes de publicar — é permanente
        sha256_cert_fingerprints: [
          // 'XX:XX:...',  ← Play App Signing
          // 'YY:YY:...',  ← chave de upload (opcional, para testes locais)
        ],
      },
    },
  ],
  'www.conviteia.com': [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.conviteia.twa',
        sha256_cert_fingerprints: [],
      },
    },
  ],
  'consulta.tec.br': [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'br.tec.consulta.twa', // TRAVAR antes de publicar — é permanente
        sha256_cert_fingerprints: [],
      },
    },
  ],
  'pix.wiki': [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'wiki.pix.twa', // TRAVAR antes de publicar — é permanente
        sha256_cert_fingerprints: [],
      },
    },
  ],
};

// Uma entrada só "vale" quando tem pelo menos um fingerprint. Sem isso, um host
// recém-adicionado (fingerprint ainda vazio) passaria a responder um assetlinks
// sem certificado nenhum, que é pior do que o fallback atual. Esta checagem
// garante que adicionar hosts aqui nunca altera o comportamento de produção
// antes do fingerprint estar preenchido.
function temFingerprint(entries: any[]): boolean {
  return entries.some(
    (e) => Array.isArray(e?.target?.sha256_cert_fingerprints)
      && e.target.sha256_cert_fingerprints.length > 0
  );
}

export async function GET(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();

  // Host específico mapeado (ex: ia.artefinal.app) → usa a entrada dele.
  // Qualquer outro host (minhai.app, www.minhai.app, subdomínios de cliente, etc.)
  // → mantém o comportamento atual: entrada padrão da minhAi.
  const mapped = ASSETLINKS_BY_HOST[host];
  const entries = mapped && temFingerprint(mapped) ? mapped : MINHAI_DEFAULT_ENTRY;

  return NextResponse.json(entries, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
