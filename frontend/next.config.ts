import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        // Catch paths WITH trailing slash and strip it
        source: '/api/proxy/:path*/',
        destination: 'http://64.23.157.35:8000/api/:path*',
      },
      {
        // Catch paths WITHOUT trailing slash
        source: '/api/proxy/:path*',
        destination: 'http://64.23.157.35:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
