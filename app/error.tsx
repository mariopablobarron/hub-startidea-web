"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook futuro: enviar a Sentry / Resend si fallos repetidos.
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <div className="container-page grid min-h-[80vh] place-items-center pt-32 text-center">
      <div>
        <div className="font-display text-7xl tracking-tight md:text-8xl">Vaya.</div>
        <p className="mt-4 max-w-lg text-[var(--color-mute)]">
          Algo no ha salido como esperábamos. Hemos guardado el aviso. Si la pieza
          que buscabas era importante, escríbenos a{" "}
          <a href="mailto:hola@hubstartidea.es" className="text-[var(--color-coral-600)] underline">
            hola@hubstartidea.es
          </a>{" "}
          y te ayudamos.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs text-[var(--color-mute)]">
            Referencia: <code className="rounded bg-[var(--color-paper-2)] px-1.5 py-0.5">{error.digest}</code>
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Reintentar
          </button>
          <Link href="/" className="btn-ghost">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
