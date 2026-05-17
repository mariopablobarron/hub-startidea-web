"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const STORAGE_KEY = "hub-cookie-consent";
type Consent = "accepted" | "rejected" | null;

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>("accepted"); // SSR neutral
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as Consent;
      setConsent(v ?? null);
    } catch {
      setConsent(null);
    }
    setHydrated(true);
  }, []);

  if (!hydrated || consent !== null) return null;

  const persist = (value: Exclude<Consent, null>) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    setConsent(value);
    // Hook futuro: si "accepted" cargar GA4 / Pixel aquí.
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-label="Aviso de cookies"
        className="fixed bottom-4 left-4 z-40 max-w-[calc(100vw-32px)] sm:max-w-xl rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-soft)] right-20 sm:right-auto"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 text-sm text-[var(--color-mute)]">
            <p>
              Usamos cookies estrictamente técnicas y, si lo permites, analítica anónima para
              entender cómo mejorar la web. Puedes consultar la{" "}
              <Link href="/privacidad" className="underline hover:text-[var(--color-coral-600)]">
                política de privacidad
              </Link>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => persist("accepted")}
                className="rounded-full bg-[var(--color-ink)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-paper)] hover:bg-[var(--color-ink-2)]"
              >
                Aceptar todo
              </button>
              <button
                type="button"
                onClick={() => persist("rejected")}
                className="rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink)] hover:border-[var(--color-ink)]"
              >
                Solo técnicas
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => persist("rejected")}
            aria-label="Cerrar (rechazar)"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--color-mute)] hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
