"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary disabled:opacity-60"
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Guardando…
        </>
      ) : (
        "Guardar cambios"
      )}
    </button>
  );
}

export function SaveBar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
      <div className="text-xs text-[var(--color-mute)]">
        Guardar dispara commit en GitHub + redeploy en Coolify (~1-2 min).
      </div>
      <div className="flex gap-2">
        {children}
        <SubmitButton />
      </div>
    </div>
  );
}
