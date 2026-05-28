import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

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

/**
 * withSentryConfig: source maps + tunneling + instrumentación auto.
 *
 * - Sin SENTRY_AUTH_TOKEN: no sube source maps (build sigue funcionando,
 *   stack traces en Sentry quedan minificados).
 * - Sin NEXT_PUBLIC_SENTRY_DSN: el SDK no inicializa nada en runtime,
 *   pero el wrap del config no rompe.
 */
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG || "startidea",
  project: process.env.SENTRY_PROJECT || "hub-startidea-web",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: false },
  // Source maps: en SDK 10+ ya no expone hideSourceMaps; el default
  // oculta los .map del bundle público y los sube a Sentry para
  // diagnóstico stack-trace. Solo configurar sourcemaps si quieres
  // desactivar (`sourcemaps: { disable: true }`).
  disableLogger: true,
  automaticVercelMonitors: false,
});
