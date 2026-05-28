"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Error boundary GLOBAL — capturador de último recurso para errores que
 * burbujean fuera de cualquier otro boundary en App Router. Reporta a
 * Sentry y muestra una pantalla mínima.
 *
 * No incluye el layout (header/footer) porque a este nivel el layout
 * podría ser parte del problema. Mantenemos texto + CTA básicos.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f4efe6",
          color: "#2a2a2a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "1rem" }}>
            Algo salió mal
          </h1>
          <p style={{ color: "#595959", marginBottom: "2rem" }}>
            Hemos registrado el error y lo revisaremos. Mientras tanto puedes
            intentarlo de nuevo o volver al inicio.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: "#e63e73",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "999px",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            <a
              href="/"
              style={{
                background: "transparent",
                color: "#2a2a2a",
                border: "1px solid #ddd5c4",
                padding: "0.75rem 1.5rem",
                borderRadius: "999px",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Volver al inicio
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                marginTop: "2rem",
                fontSize: "0.75rem",
                color: "#8e8e8e",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
