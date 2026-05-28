/**
 * Sentry server + edge runtime instrumentation.
 *
 * Next.js 15 llama a `register()` en el arranque del runtime (server y
 * edge). Si NEXT_PUBLIC_SENTRY_DSN no está definido, no inicializa nada
 * — el código sigue funcionando sin Sentry. Esto permite probar local
 * sin que tengamos que setear un DSN.
 *
 * `onRequestError` reporta automáticamente errores no manejados de
 * páginas (App Router) a Sentry. Recomendado por Sentry desde SDK 8+.
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      // Trazas: 10% por defecto. Subir si necesitamos más visibilidad.
      tracesSampleRate: 0.1,
      // No mandamos PII por defecto (IP, headers, etc.) — coworking puede
      // tener visitantes que prefieren privacidad. Si necesitamos
      // diagnósticos puntuales, subir a true temporalmente.
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
