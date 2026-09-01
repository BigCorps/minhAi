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

// ─────────────────────────────────────────────────────────────────────────────
// Convite IA — publicado na Play Store em ago/2026
//
// Declarado como constante porque a MESMA entrada precisa responder em três
// lugares: conviteia.com, www.conviteia.com e qualquer <slug>.conviteia.com.
// Verificação de TWA é por ORIGEM: sem cobrir o subdomínio, a barra de URL
// reaparece exatamente quando o app abre um convite publicado.
// ─────────────────────────────────────────────────────────────────────────────
const CONVITEIA_ENTRY = [
  {
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ],
    target: {
      namespace: 'android_app',
      package_name: 'com.conviteia.twa',
      sha256_cert_fingerprints: [
        // Já existente
        'A1:DB:22:F2:EA:E5:19:23:17:EB:A2:33:B2:5E:A3:D0:22:6A:D3:F6:D1:5D:3C:C9:5C:A8:13:9C:E3:98:51:76',

        // Chave de upload / teste local
        'D3:90:68:07:23:82:39:04:B0:A4:76:1F:E3:76:FE:34:B7:44:FA:66:C2:83:54:1F:5A:BA:D0:BC:58:33:9E:57',
        'D3:90:68:07:23:82:39:04:B0:A4:76:1F:E3:76:FE:34:87:44:FA:66:C2:83:54:1F:5A:BA:D0:BC:58:33:9E:57',

        // Solicitados agora pelo Google Play
        'B5:A7:20:A1:23:9F:A6:6F:4C:F4:8F:95:17:69:9A:28:DF:7B:96:64:09:F9:93:B6:5E:E8:F6:2E:2C:69:E2:34',
        '5B:34:AB:B6:CC:19:B4:E2:5F:7E:08:D3:77:B6:14:B8:24:D7:24:20:BC:40:77:6B:DD:42:BC:C4:2C:C3:4E:CB',
        'A1:DB:22:F2:EA:E5:19:23:17:EB:A2:33:B2:5E:A3:D0:22:6A:D3:F6:D1:50:3C:C9:5C:A8:13:9C:E3:98:51:76',
      ],
    },
  },
];

const ASSETLINKS_BY_HOST: Record<string, any[]> = {
 'ia.artefinal.app': [
  {
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ],
    target: {
      namespace: 'android_app',
      package_name: 'com.artefinal.app',
      sha256_cert_fingerprints: [
        // Play App Signing — confirmado: é o que www.artefinal.app publica e está verde
        '72:A9:CE:12:52:E5:13:00:56:4E:BD:81:C7:72:28:24:3E:1F:77:A9:36:CE:14:6F:93:0D:76:62:59:02:6D:E4',
        // chave de upload (APK local) — permite testar build local sem barra
        'DA:46:AE:F5:3E:53:A7:58:F1:8D:DE:3C:92:8A:BF:7B:D1:30:35:6F:DC:BD:5A:7A:2D:A7:D9:6B:58:37:62:72',
      ],
    },
  },
],
 

'app.min.ia.br': [
  {
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds',
    ],
    target: {
      namespace: 'android_app',
      package_name: 'com.minia.app',
      sha256_cert_fingerprints: [
        'DC:15:79:EA:E1:0A:88:43:82:BA:8A:04:A6:7B:6C:C1:03:CA:42:80:ED:10:00:91:70:E1:10:27:F0:03:4A:02',
        // chave de upload (APK local)
        '48:65:D5:46:E5:C4:C9:E7:1F:2D:C1:BF:6E:AB:38:D9:94:46:16:07:E5:65:E2:3D:DA:60:17:F7:3E:7A:B6:6D',
      ],
    },
  },
],

  // ── Convite IA (ativo) ─────────────────────────────────────────────────────
  // Os subdomínios de convite publicado (<slug>.conviteia.com) NÃO entram aqui:
  // são infinitos. São resolvidos por sufixo dentro do GET, mais abaixo.
  'conviteia.com': CONVITEIA_ENTRY,
  'www.conviteia.com': CONVITEIA_ENTRY,

  // ───────────────────────────────────────────────────────────────────────────
  // TWAs ainda não publicados (ConsultaTec / Pix Wiki)
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
  
  // ── ConsultaTec (em análise na Play Store, set/2026) ────────────────────────
  'consulta.tec.br': [
    {
      relation: [
        'delegate_permission/common.handle_all_urls',
        'delegate_permission/common.get_login_creds',
      ],
      target: {
        namespace: 'android_app',
        package_name: 'br.tec.consulta.twa',
        sha256_cert_fingerprints: [
          '09:5D:1C:C3:35:F0:59:01:6B:1B:97:E2:49:BE:CD:CE:7C:B7:3F:5B:C9:CD:F7:2B:08:1C:E9:72:B6:07:78:CE',
          'F8:FB:2D:7C:31:F5:56:43:62:BD:B3:E1:6A:CE:D8:57:63:D8:AF:9A:5E:9E:14:FC:16:FE:72:5A:8B:40:A1:56',
          '86:1D:2C:00:27:8B:BF:39:2C:36:65:2A:57:0A:E5:42:11:A3:FA:3D:BF:A3:7E:60:CA:A5:89:0D:4B:8D:B0:40',
        ],
      },
    },
  ],

  // ── Pix Wiki (ativo) ───────────────────────────────────────────────────────
  'pix.wiki': [
    {
      relation: [
        'delegate_permission/common.handle_all_urls',
        'delegate_permission/common.get_login_creds',
      ],
      target: {
        namespace: 'android_app',
        package_name: 'wiki.pix.twa',
        sha256_cert_fingerprints: [
          // Chave de upload — assina o .aab local (conferido com keytool)
          '39:F8:2C:3C:A6:34:87:68:B1:86:18:32:2E:79:02:82:20:4A:88:6B:3E:FE:E5:76:E1:52:72:A9:35:B3:49:35',
          // Fornecidos pelo Play Console (assinatura do app + chave adicional)
          '6D:36:0C:96:BB:DA:07:90:87:52:4C:24:13:29:62:DD:3F:02:E0:8D:7C:B3:9A:65:03:56:C6:B9:EC:E8:C1:07',
          'BF:56:0C:3B:4D:C3:E0:3F:5C:31:A8:DD:30:82:6F:B5:E3:1F:8A:5A:38:F0:DC:AA:2A:17:68:91:FA:2D:7D:C5',
        ],
      },
    },
  ],
};

// Hosts com subdomínio dinâmico: um convite publicado mora em
// <slug>.conviteia.com, e cada um é uma origem diferente para o Android.
// Listar host por host seria impossível — daí a correspondência por sufixo.
const ASSETLINKS_BY_SUFFIX: Array<[string, any[]]> = [
  ['.conviteia.com', CONVITEIA_ENTRY],
];

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

function resolverEntries(host: string): any[] | undefined {
  const exato = ASSETLINKS_BY_HOST[host];
  if (exato) return exato;

  const porSufixo = ASSETLINKS_BY_SUFFIX.find(([sufixo]) => host.endsWith(sufixo));
  return porSufixo?.[1];
}

export async function GET(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();

  // Host mapeado (ex: ia.artefinal.app) ou subdomínio de marca
  // (ex: noivos.conviteia.com) → usa a entrada da marca.
  // Qualquer outro host (minhai.app, www.minhai.app, subdomínios de assistente
  // de cliente, etc.) → mantém o comportamento atual: entrada padrão da minhAi.
  const mapped = resolverEntries(host);
  const entries = mapped && temFingerprint(mapped) ? mapped : MINHAI_DEFAULT_ENTRY;

  return NextResponse.json(entries, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
