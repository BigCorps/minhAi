/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  typescript: { ignoreBuildErrors: true },
  outputFileTracingIncludes: {
    '/api/arte/gstest': ['./node_modules/@jspawn/ghostscript-wasm/**'],
    '/api/conviteria/lacre': ['./public/fontes/**'],
  },
  serverExternalPackages: ['@jspawn/ghostscript-wasm', 'sharp', 'opentype.js'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false, crypto: false, canvas: false };
      config.module.rules.push({ test: /\.onnx$/, type: 'asset/resource' });
      config.module.rules.push({ test: /\.wasm$/, type: 'asset/resource' });
      config.resolve.alias = { ...config.resolve.alias, 'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js' };
    }
    if (isServer) config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },

  async rewrites() {
    return {
      beforeFiles: [
        // Midia.Pro — preservado integralmente.
        {
          source: '/:midiaPath((?!_next(?:/|$)|api(?:/|$)|auth(?:/|$)|brands(?:/|$)|favicon\\.ico$|manifest\\.json$|manifest\\.webmanifest$|robots\\.txt$|sitemap\\.xml$|llms\\.txt$|midia-sw\\.js$|play$|anuncie(?:/|$)).+)',
          has: [{ type: 'host', value: '(?<midiaSlug>[^.]+)\\.midia\\.pro' }], destination: '/midia/not-found',
        },
        { source: '/favicon.ico', has: [{ type: 'host', value: '(?:[^.]+\\.)?midia\\.pro' }], destination: '/brands/midia/icon-192.png' },
        { source: '/manifest.webmanifest', has: [{ type: 'host', value: '(?<midiaSlug>[^.]+)\\.midia\\.pro' }], destination: '/brands/midia/player-manifest.webmanifest' },
        { source: '/manifest.json', has: [{ type: 'host', value: '(?<midiaSlug>[^.]+)\\.midia\\.pro' }], destination: '/brands/midia/player-manifest.webmanifest' },
        { source: '/manifest.webmanifest', has: [{ type: 'host', value: '(?:www\\.)?midia\\.pro' }], destination: '/brands/midia/manifest.webmanifest' },
        { source: '/manifest.json', has: [{ type: 'host', value: '(?:www\\.)?midia\\.pro' }], destination: '/brands/midia/manifest.webmanifest' },
        { source: '/llms.txt', has: [{ type: 'host', value: '(?:[^.]+\\.)?midia\\.pro' }], destination: '/brands/midia/llms.txt' },
        { source: '/robots.txt', has: [{ type: 'host', value: '(?:[^.]+\\.)?midia\\.pro' }], destination: '/midia/robots.txt' },
        { source: '/sitemap.xml', has: [{ type: 'host', value: '(?:[^.]+\\.)?midia\\.pro' }], destination: '/midia/sitemap.xml' },
        { source: '/play', has: [{ type: 'host', value: '(?<midiaSlug>[^.]+)\\.midia\\.pro' }], destination: '/midia/player/:midiaSlug' },
        { source: '/anuncie/:code', has: [{ type: 'host', value: '(?<midiaSlug>[^.]+)\\.midia\\.pro' }], destination: '/midia/public/:midiaSlug/anuncie/:code' },
        { source: '/', has: [{ type: 'host', value: '(?<midiaSlug>[^.]+)\\.midia\\.pro' }], destination: '/midia/public/:midiaSlug' },
        { source: '/', has: [{ type: 'host', value: 'midia\\.pro' }], destination: '/midia' },
        { source: '/login', has: [{ type: 'host', value: 'midia\\.pro' }], destination: '/midia/login' },
        { source: '/aviso', has: [{ type: 'host', value: '(?:www\\.)?midia\\.pro' }], destination: '/midia/aviso' },
        { source: '/termos', has: [{ type: 'host', value: '(?:www\\.)?midia\\.pro' }], destination: '/midia/termos' },
        { source: '/exclusao', has: [{ type: 'host', value: '(?:www\\.)?midia\\.pro' }], destination: '/midia/exclusao' },
        { source: '/dashboard', has: [{ type: 'host', value: 'midia\\.pro' }], destination: '/midia/dashboard' },
        { source: '/dashboard/:path*', has: [{ type: 'host', value: 'midia\\.pro' }], destination: '/midia/dashboard/:path*' },

        // Admin BigCorps. Gate 10 acrescenta apenas pixwiki-leads.
        {
          source: '/:adminPath((?!api(?:/|$)|_next(?:/|$)|login$|logout$|auth/callback$|usuarios(?:/|$)|financeiro$|custos$|margem$|atencao$|agora$|whatsapp$|midia$|pixwiki-leads$|dashboard(?:/|$)|robots\\.txt$|favicon\\.ico$).+)',
          has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/not-found',
        },
        { source: '/', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin' },
        { source: '/robots.txt', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/robots.txt' },
        { source: '/login', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/login' },
        { source: '/logout', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/logout' },
        { source: '/usuarios/:path*', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/usuarios/:path*' },
        { source: '/financeiro', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/financeiro' },
        { source: '/custos', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/custos' },
        { source: '/margem', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/margem' },
        { source: '/atencao', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/atencao' },
        { source: '/agora', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/agora' },
        { source: '/whatsapp', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/whatsapp' },
        { source: '/midia', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/midia' },
        { source: '/pixwiki-leads', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/pixwiki-leads' },
        { source: '/auth/callback', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin/auth/callback' },
        { source: '/dashboard', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin' },
        { source: '/dashboard/:path*', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }], destination: '/admin' },

        // MCP da minhAi.
        { source: '/:path*', has: [{ type: 'host', value: 'mcp.minhai.app' }], destination: 'https://qyonozbroekuqlotqcbm.supabase.co/functions/v1/mcp-server/:path*' },

        // API pública do PixWiki.
        { source: '/api/v1/:path*', has: [{ type: 'host', value: '(?:www\\.)?pix\\.wiki' }], destination: '/api/pixwiki/v1?resource=/:path*' },

        // Branding e superfície pública de slug.pix.wiki.
        { source: '/favicon.ico', has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }], destination: '/brands/pix/favicon.png' },
        { source: '/manifest.webmanifest', has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }], destination: '/brands/pix/manifest.webmanifest' },
        { source: '/manifest.json', has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }], destination: '/brands/pix/manifest.webmanifest' },
        { source: '/llms.txt', has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }], destination: '/brands/pix/llms.txt' },
        { source: '/c/:token', has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }], destination: '/pix/c/:token' },
        {
          source: '/:pixwikiPath((?!_next(?:/|$)|brands(?:/|$)|\\.well-known(?:/|$)|favicon\\.ico$|manifest\\.json$|manifest\\.webmanifest$|robots\\.txt$|sitemap\\.xml$|llms\\.txt$|c(?:/|$)|[0-9][0-9.,]*$).+)',
          has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }], destination: '/pix/not-found',
        },
        { source: '/', has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }], destination: '/pix/:pixwikiSlug' },
        { source: '/:valor([0-9][0-9.,]*)', has: [{ type: 'host', value: '(?<pixwikiSlug>[^.]+)\\.pix\\.wiki' }], destination: '/pix/:pixwikiSlug/:valor' },
      ],
      afterFiles: [], fallback: [],
    };
  },

  async redirects() {
    return [
      { source: '/:path*', has: [{ type: 'host', value: 'www\\.midia\\.pro' }], destination: 'https://midia.pro/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'minhai.app' }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'minhai.com.br' }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'www.minhai.com.br' }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'minhaia.app' }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'nossaia.app' }], destination: 'https://www.minhai.app/:path*', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'suaia.app' }], destination: 'https://www.minhai.app/:path*', permanent: true },
    ];
  },

  async headers() {
    return [
      { source: '/midia-sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' }] },
      {
        source: '/:path*', has: [{ type: 'host', value: 'admin\\.minhai\\.app' }],
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' }, { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }, { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
      {
        source: '/:path*', has: [{ type: 'host', value: '(?:[^.]+\\.)?pix\\.wiki' }],
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=()' },
        ],
      },
      {
        source: '/:path*', has: [{ type: 'host', value: '[^.]+\\.pix\\.wiki' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      { source: '/c/:token', has: [{ type: 'host', value: '(?:[^.]+\\.)?pix\\.wiki' }], headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] },
      { source: '/:path*.onnx', headers: [{ key: 'Content-Type', value: 'application/octet-stream' }, { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }, { key: 'Access-Control-Allow-Origin', value: '*' }] },
      { source: '/:path*.wasm', headers: [{ key: 'Content-Type', value: 'application/wasm' }, { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }, { key: 'Access-Control-Allow-Origin', value: '*' }] },
      { source: '/:path*.mjs', headers: [{ key: 'Content-Type', value: 'application/javascript' }, { key: 'Access-Control-Allow-Origin', value: '*' }] },
      { source: '/pdf-worker/:path*', headers: [{ key: 'Content-Type', value: 'application/javascript' }, { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }, { key: 'Access-Control-Allow-Origin', value: '*' }] },
    ];
  },
};

module.exports = nextConfig;
