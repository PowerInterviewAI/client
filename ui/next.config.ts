import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Disable Strict Mode to prevent double mounting in development
  trailingSlash: true, // Ensure static assets are served correctly
  output: 'export',
  distDir: 'out',
};

export default nextConfig;
