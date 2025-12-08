/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow any ngrok tunnel for MiniPay mobile testing
  allowedDevOrigins: [
    '*.ngrok.io',
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
  ],

  // Optimize for development with ngrok
  compress: true,

  // Reduce chunk sizes for faster loading over ngrok
  productionBrowserSourceMaps: false,

  // Disable static optimization in dev to prevent chunk issues
  ...(process.env.NODE_ENV === 'development' && {
    optimizeFonts: false,
  }),

  // Allow cross-origin requests for mobile testing
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  webpack: (config, { dev, isServer }) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    // Fix for MetaMask SDK trying to import React Native modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };

    // Optimize chunk loading for ngrok
    if (dev && !isServer) {
      // Disable chunk splitting in development to prevent timeout issues
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        minimize: false,
      };
    }

    return config
  },
};

module.exports = nextConfig;
