import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "http://192.168.1.2:3000",
    "192.168.1.2",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
