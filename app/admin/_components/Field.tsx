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
        <button type="submit" className="btn-primary">
          Guardar cambios
        </button>
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
