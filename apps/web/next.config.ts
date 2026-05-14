import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@betri/db", "@betri/domain", "@betri/types"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
