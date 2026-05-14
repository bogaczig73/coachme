import path from "node:path";
import dotenv from "dotenv";
import type { NextConfig } from "next";

// Monorepo: load shared secrets from the workspace-root .env first,
// then let Next's own loader override with apps/web/.env.local if present.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@betri/db", "@betri/domain", "@betri/types"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
