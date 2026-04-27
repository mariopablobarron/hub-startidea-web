import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  // Standalone solo cuando construimos en Docker (Coolify): evita duplicar
  // node_modules en disco durante el desarrollo local.
  output: process.env.NEXT_OUTPUT_STANDALONE ? "standalone" : undefined,
  reactStrictMode: true,
  // Evita que Next infiera el workspace root mirando al lockfile del HOME.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "hubstartidea.es" },
      { protocol: "https", hostname: "startidea.es" },
    ],
  },
};

export default config;
