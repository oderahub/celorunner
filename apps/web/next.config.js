/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",   // This fixes the 200MB Cloudflare error

  reactStrictMode: true,

  allowedDevOrigins: [
    '*.ngrok.io',
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
  ],

  compress: true,
  productionBrowserSourceMaps: false,

  ...(process.env.NODE_ENV === 'development' && {
    optimizeFonts: false,
  }),

  // FIXED: Always return an array — works in dev AND production
  async headers() {
    const devHeaders = process.env.NODE_ENV === 'development'
      ? [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ]
      : [];

    return [
      {
        source: '/:path*',
        headers: devHeaders,
      },
    ];
  },

  webpack: (config, { dev, isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };

    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        minimize: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;