"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

/**
 * Selector de fecha que NAVEGA al cambiar (no envía form).
 *
 * Vive fuera del form principal de reserva. Cambiar la fecha recarga
 * la página con ?fecha=YYYY-MM-DD, lo que refresca el SlotPicker con
 * la nueva ocupación del día.
 *
 * Mantiene cualquier otro searchParam (sala, etc.) intacto.
 */
export function DateNavigator({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const onChange = (newDate: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("fecha", newDate);
    router.push(`/reservar?${next.toString()}`);
  };

  return (
    <label className="block text-sm">
      <span className="font-medium">
        <Calendar size={14} className="mr-1 inline-block align-text-bottom" />
        Fecha
      </span>
      <input
        type="date"
        defaultValue={value}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
      />
    </label>
  );
}
