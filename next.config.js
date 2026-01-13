/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silenciar warning webpack vs turbopack
  turbopack: {},

  // Otimizações
  experimental: {
    optimizePackageImports: ['@ricky0123/vad-web'],
  },

  // Webpack ainda necessário para .onnx e .wasm
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

  // Headers para assets
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

  // Transpile packages
  transpilePackages: ['@ricky0123/vad-web', 'onnxruntime-web'],
};

module.exports = nextConfig;