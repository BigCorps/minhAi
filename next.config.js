/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  typescript: {
    ignoreBuildErrors: true,
  },

// `experimental: { webpackBuildWorker: false }` removido: o Next 16 já
  // reclama dele no log ("⨯ Experiments (use with caution)").

  outputFileTracingIncludes: {
    '/api/arte/gstest': ['./node_modules/@jspawn/ghostscript-wasm/**'],
    '/api/conviteria/lacre': ['./public/fontes/**'],
  },

  serverExternalPackages: ['@jspawn/ghostscript-wasm', 'sharp', 'opentype.js'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  webpack: (config, { isServer }) => {
    // O bloco de diagnóstico que existia aqui — plugin de log por módulo e
    // as quatro flags de optimization — foi removido. Ele servia para achar
    // o travamento do build do ArteFinal, que já foi resolvido (era o import
    // do RemoverFundoDisplay em app/arte/page.tsx).
    //
    // Manter custava caro: ~100 mil linhas de log por build, e
    // `providedExports/usedExports = false` desligava o tree-shaking, que é
    // o que faz código de rota de API ser avaliado ao pré-renderizar página
    // de dashboard.
    //
    // Se um dia precisar diagnosticar de novo, coloque de volta, rode uma
    // vez, e tire.

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        canvas: false,
      };
      config.module.rules.push({ test: /\.onnx$/, type: 'asset/resource' });
      config.module.rules.push({ test: /\.wasm$/, type: 'asset/resource' });

      // PDF.js worker
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js',
      };
    }

    // Canvas é problemático no server-side
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }

    return config;
  },

  // ── Rewrites: proxy mcp.minhai.app → Supabase Edge Function ─────────────────
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'mcp.minhai.app' }],
          destination:
            'https://qyonozbroekuqlotqcbm.supabase.co/functions/v1/mcp-server/:path*',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // ────────────────────────────────────────────────────────────────────────────

  async redirects() {
    return [
      // Domínios raiz sem subdomínio → www.minhai.app
      { source: '/:path*', has: [{ type: 'host', value: 'minhai.app'        }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'minhai.com.br'     }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'www.minhai.com.br' }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'minhaia.app'       }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'nossaia.app'       }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'suaia.app'         }], destination: 'https://www.minhai.app/:path*', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*.onnx',
        headers: [
          { key: 'Content-Type',                value: 'application/octet-stream' },
          { key: 'Cache-Control',               value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/:path*.wasm',
        headers: [
          { key: 'Content-Type',                value: 'application/wasm' },
          { key: 'Cache-Control',               value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/:path*.mjs',
        headers: [
          { key: 'Content-Type',                value: 'application/javascript' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      // Headers para PDF.js worker
      {
        source: '/pdf-worker/:path*',
        headers: [
          { key: 'Content-Type',                value: 'application/javascript' },
          { key: 'Cache-Control',               value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },

  // transpilePackages: ['@ricky0123/vad-web', 'onnxruntime-web'],
};

module.exports = nextConfig;