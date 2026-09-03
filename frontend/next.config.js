/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/emails/:path*',
        destination: 'http://localhost:5001/api/emails/:path*',
      },
      {
        source: '/api/slack/:path*',
        destination: 'http://localhost:5001/api/slack/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
