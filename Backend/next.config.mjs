const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    DEV_API: 'http://localhost:3000',
    PRODUCTION_API: 'https://api-dev-minimal-v4.vercel.app',
  },
  // Add CORS headers to allow frontend to access backend resources
  async headers() {
    return [
      {
        // Apply these headers to all routes including static files
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // Allow all origins in development
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
