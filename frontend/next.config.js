/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/webhook',
        destination: 'http://localhost:8000/webhook',
      },
      {
        source: '/send-whatsapp',
        destination: 'http://localhost:8000/send-whatsapp',
      },
    ];
  },
};

module.exports = nextConfig;
