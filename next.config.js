/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},

  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    webpackBuildWorker: false,
  },

  outputFileTracingIncludes: {
    '/api/arte/gstest': ['./node_modules/@jspawn/ghostscript-wasm/**'],
  },

  // ⚠️ opentype.js entrou AQUI, na lista que já existia.
  // Não é uma segunda chave `serverExternalPackages` — a última venceria e
  // ghostscript-wasm + sharp voltariam a ser empacotados.
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

  webpack: (config, { isServer, webpack }) => {
    config.optimization.minimize = false;
    config.optimization.concatenateModules = false;
    config.optimization.providedExports = false;
    config.optimization.usedExports = false;
    config.plugins.push({
      apply(compiler) {
        compiler.hooks.compilation.tap('LogBuildingModules', (compilation) => {
          compilation.hooks.buildModule.tap('LogBuildingModules', (module) => {
            console.log('[build-start]', module.resource || module.identifier());
          });
          compilation.hooks.succeedModule.tap('LogBuildingModules', (module) => {
            console.log('[build-done]', module.resource || module.identifier());
          });
        });
      },
    });
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        canvas: false,
      };
      config.module.rules.push({
        test: /\.onnx$/,
        type: 'asset/resource',
      });
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      });

      // Configuração para PDF.js worker
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js',
      };
    }

    // Canvas é problemático no server-side, sempre fazer fallback
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

      // ── Conviteia ────────────────────────────────────────────────────────
      // O canônico é conviteia.com SEM www: é o domínio dos subdomínios de
      // convite (slug.conviteia.com), e ter www e não-www servindo o mesmo
      // conteúdo divide SEO e confunde o convidado.
      //
      // O .com.br é âncora de confiança e captura de erro de digitação —
      // redireciona, não hospeda. Assim não vira código para manter.
      //
      // ⚠️ NÃO acrescente regra para *.conviteia.com aqui: os subdomínios de
      // convite são tratados pelo middleware, e um redirect nesta lista os
      // mataria antes de chegar lá.
      { source: '/:path*', has: [{ type: 'host', value: 'www.conviteia.com'    }], destination: 'https://conviteia.com/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'conviteia.com.br'     }], destination: 'https://conviteia.com/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'www.conviteia.com.br' }], destination: 'https://conviteia.com/:path*', permanent: true },
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