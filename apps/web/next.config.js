/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",          // ← ADD THIS LINE (this is the fix)

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

  async headers() { /* ... */ },

  webpack: (config, { dev, isServer }) => { /* ... */ },
};

module.exports = nextConfig;