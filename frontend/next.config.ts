import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'http://64.23.157.35:8000/api/:path*', // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
