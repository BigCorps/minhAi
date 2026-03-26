/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Permitir imagens do Supabase Storage para logos
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
      };
      config.module.rules.push({
        test: /\.onnx$/,
        type: 'asset/resource',
      });
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      });
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'minhai.app' }],
        destination: 'https://www.minhai.app/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'minhai.com.br' }],
        destination: 'https://www.minhai.app/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.minhai.com.br' }],
        destination: 'https://www.minhai.app/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*.onnx',
        headers: [
          { key: 'Content-Type', value: 'application/octet-stream' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/:path*.wasm',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        source: '/:path*.mjs',
        headers: [
          { key: 'Content-Type', value: 'application/javascript' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
  transpilePackages: ['@ricky0123/vad-web', 'onnxruntime-web'],
};
module.exports = nextConfig;
