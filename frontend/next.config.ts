import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        // Catch paths WITH trailing slash and strip it
        source: '/api/proxy/:path*/',
        destination: 'http://backend:5000/api/:path*',
      },
      {
        // Catch paths WITHOUT trailing slash
        source: '/api/proxy/:path*',
        destination: 'http://backend:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
