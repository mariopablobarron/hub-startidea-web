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
    // Sin sharp en el runtime alpine. Las imágenes ya están a tamaño
    // razonable (~1600px) — sirvelas tal cual sin optimización en runtime.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "hubstartidea.es" },
      { protocol: "https", hostname: "startidea.es" },
    ],
  },
};

export default config;
