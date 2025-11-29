const nextConfig = {
  reactStrictMode: true,
  env: {
    DEV_API: 'http://localhost:3000',
    PRODUCTION_API: 'https://api-dev-minimal-v4.vercel.app',
  },
};

export default nextConfig;
