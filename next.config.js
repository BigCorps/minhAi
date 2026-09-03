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

      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js',
      };
    }

    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }

    return config;
  },

  async rewrites() {
    return {
      beforeFiles: [
        // Admin BigCorps / minhAi.
        // Isolamento por host: qualquer página que NÃO pertença à pequena
        // superfície pública do Admin é reescrita para o 404 administrativo.
        // /api e /_next ficam fora porque são infraestrutura compartilhada.
        {
          source:
            '/:adminPath((?!api(?:/|$)|_next(?:/|$)|login$|logout$|auth/callback$|usuarios(?:/|$)|dashboard(?:/|$)|robots\\.txt$|favicon\\.ico$).+)',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin/not-found',
        },

        // O subdomínio "admin" já é reservado no middleware, então estes
        // rewrites entregam somente as rotas administrativas sem interferir
        // nos slugs de clientes nem nos demais produtos do monorepo.
        {
          source: '/',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin',
        },
        {
          source: '/robots.txt',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin/robots.txt',
        },
        {
          source: '/login',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin/login',
        },
        {
          source: '/logout',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin/logout',
        },
        {
          source: '/usuarios/:path*',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin/usuarios/:path*',
        },
        {
          source: '/auth/callback',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin/auth/callback',
        },

        // O middleware compartilhado redireciona um usuário autenticado que
        // abre /login para /dashboard. No host admin esse destino volta para
        // a home administrativa em vez de expor o dashboard da minhAi.
        {
          source: '/dashboard',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin',
        },
        {
          source: '/dashboard/:path*',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
          destination: '/admin',
        },

        // MCP da minhAi
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'mcp.minhai.app' }],
          destination:
            'https://qyonozbroekuqlotqcbm.supabase.co/functions/v1/mcp-server/:path*',
        },

        // API pública do PixWiki.
        // Mantém URLs bonitas como /api/v1/receipts sem precisar de uma
        // pasta Next.js catch-all chamada "[...path]", que o upload pelo
        // GitHub Web pode rejeitar.
        {
          source: '/api/v1/:path*',
          has: [{ type: 'host', value: '(?:www\\.)?pix\\.wiki' }],
          destination: '/api/pixwiki/v1?resource=/:path*',
        },

        // Branding básico dos subdomínios PixWiki.
        {
          source: '/favicon.ico',
          has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }],
          destination: '/brands/pix/favicon.png',
        },
        {
          source: '/manifest.webmanifest',
          has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }],
          destination: '/brands/pix/manifest.webmanifest',
        },
        {
          source: '/manifest.json',
          has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }],
          destination: '/brands/pix/manifest.webmanifest',
        },

        // PixWiki Link: slug.pix.wiki → /pix/[slug]
        {
          source: '/',
          has: [
            {
              type: 'host',
              value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki',
            },
          ],
          destination: '/pix/:pixwikiSlug',
        },
        {
          source: '/:valor([0-9][0-9.,]*)',
          has: [
            {
              type: 'host',
              value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki',
            },
          ],
          destination: '/pix/:pixwikiSlug/:valor',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  async redirects() {
    return [
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
        source: '/:path*',
        has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
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
};

module.exports = nextConfig;
