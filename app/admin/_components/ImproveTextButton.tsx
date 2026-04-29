"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

type Props = {
  /** Selector del textarea/input al que aplicarle la mejora. */
  targetSelector: string;
  /** Contexto opcional sobre qué tipo de campo es (Hero, sala CC33, etc.). */
  context?: string;
};

const MODES = [
  { key: "polish", label: "Mejorar" },
  { key: "shorter", label: "Acortar" },
  { key: "longer", label: "Ampliar" },
  { key: "warmer", label: "Más cálido" },
] as const;

export function ImproveTextButton({ targetSelector, context }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(mode: (typeof MODES)[number]["key"]) {
    setError(null);
    const el = document.querySelector(targetSelector) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) {
      setError("Campo no encontrado");
      return;
    }
    const text = el.value;
    if (!text.trim()) {
      setError("Escribe algo primero");
      return;
    }

    setBusy(mode);
    try {
      const r = await fetch("/api/admin/improve-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, context, mode }),
      });
      if (!r.ok) {
        setError(`Error ${r.status}`);
        return;
      }
      const { improved } = (await r.json()) as { improved: string };
      // Setea el valor disparando input para que React/Svelte lo capture
      const setter = Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, improved);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      setOpen(false);
    } catch (e) {
      setError(String((e as Error).message).slice(0, 100));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-coral-50)] px-2.5 py-1 text-xs font-medium text-[var(--color-coral-700)] hover:bg-[var(--color-coral-100)]"
      >
        <Sparkles size={12} />
        IA
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 flex w-44 flex-col rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-1 shadow-lg">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => run(m.key)}
              disabled={!!busy}
              className="flex items-center justify-between gap-2 rounded px-3 py-1.5 text-left text-xs hover:bg-[var(--color-paper-2)] disabled:opacity-50"
            >
              {m.label}
              {busy === m.key && <Loader2 size={12} className="animate-spin" />}
            </button>
          ))}
          {error && <div className="px-3 py-1 text-[10px] text-red-600">{error}</div>}
        </div>
      )}
    </div>
  );
}
