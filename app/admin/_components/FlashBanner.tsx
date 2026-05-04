import { CheckCircle2, AlertCircle } from "lucide-react";

/** Banner que aparece tras un Save con éxito (?saved=1) o error (?error=…). */
export function FlashBanner({ saved, error }: { saved?: boolean; error?: string }) {
  if (!saved && !error) return null;
  if (saved) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      >
        <CheckCircle2 size={16} aria-hidden />
        <div>
          <strong>Cambios guardados.</strong> El nuevo build estará en producción en 1-2 minutos.
        </div>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div>
        <strong>Error al guardar.</strong>
        <p className="mt-1 text-xs opacity-80">{error}</p>
      </div>
    </div>
  );
}
