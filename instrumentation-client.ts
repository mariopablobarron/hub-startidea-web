/**
 * Sentry browser instrumentation. Cargado por Next.js 15 en el arranque
 * del cliente. Estándar desde Sentry SDK 8+ — antes era
 * `sentry.client.config.ts` aparte.
 *
 * Sin DSN no inicializa nada (no romper local dev / preview sin Sentry).
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Session Replay: grabamos sólo cuando hay error (no 100% sesiones).
    // Permite ver qué hacía el usuario justo antes del crash sin coste
    // ni problemas de privacidad para visitantes normales.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({
        // Privacidad: anonimizar texto y media de visitantes por defecto.
        // Si necesitamos ver detalle de un componente concreto, marcar
        // con className="sentry-unmask".
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    sendDefaultPii: false,
  });
}

// Captura las transiciones de router del App Router como spans. Útil
// para ver navegaciones lentas / errores durante client transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
