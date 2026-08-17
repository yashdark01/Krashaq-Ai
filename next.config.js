/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for MongoDB driver on Vercel serverless
  serverExternalPackages: ['mongodb', 'ioredis', 'faiss-node'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.vercel.app' }],
  },
};

module.exports = nextConfig;
