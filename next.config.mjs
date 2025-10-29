/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  images: {
    remotePatterns: [],
  },
  eslint:{
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
