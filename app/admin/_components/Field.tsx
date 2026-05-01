"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-[var(--color-mute)]">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm focus:border-[var(--color-ink)] focus:outline-none",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm focus:border-[var(--color-ink)] focus:outline-none",
        props.className,
      )}
    />
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

function SubmitButton() {
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

/** Banner que aparece tras un Save con éxito (se lee de ?saved=1). */
export function FlashBanner({ saved, error }: { saved?: boolean; error?: string }) {
  if (!saved && !error) return null;
  if (saved) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 size={16} />
        <div>
          <strong>Cambios guardados.</strong> El nuevo build estará en producción en 1-2 minutos.
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div>
        <strong>Error al guardar.</strong>
        <p className="mt-1 text-xs opacity-80">{error}</p>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  back,
  description,
}: {
  title: string;
  back?: { href: string; label: string };
  description?: string;
}) {
  return (
    <header className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
      {back && (
        <a href={back.href} className="text-xs text-[var(--color-mute)] hover:text-[var(--color-ink)]">
          ← {back.label}
        </a>
      )}
      <h1 className="mt-2 font-display text-2xl tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-sm text-[var(--color-mute)]">{description}</p>}
    </header>
  );
}
