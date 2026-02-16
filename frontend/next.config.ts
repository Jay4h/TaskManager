import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "http://192.168.1.2:3000",
    "192.168.1.2",
    "localhost",
    "127.0.0.1",
  ],
  // Disable automatic static optimization to reduce RSC calls
  experimental: {
    appDir: true,
  },
  // Disable prefetching
  reactStrictMode: true,
};

export default nextConfig;
