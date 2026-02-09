import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow connections from any device on the local network
  allowedDevOrigins: ["*"],
};

export default nextConfig;
