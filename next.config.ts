import type { NextConfig } from "next";
import path from "node:path";

/**
 * Cabeceras de seguridad aplicadas a TODAS las rutas.
 * Probadas con Mozilla Observatory + securityheaders.com.
 */
const securityHeaders = [
  // Bloquea framing (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Bloquea sniffing de MIME types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No exporta el referrer cross-origin (privacidad).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restringe APIs sensibles del navegador.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Forzar HTTPS durante 2 años en navegadores compatibles.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const config: NextConfig = {
  output: process.env.NEXT_OUTPUT_STANDALONE ? "standalone" : undefined,
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  compress: true,
  images: {
    // Sin sharp en runtime alpine. Imágenes ya a tamaño razonable.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "hubstartidea.es" },
      { protocol: "https", hostname: "startidea.es" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
