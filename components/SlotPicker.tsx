"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Grid visual para selección de franjas horarias de reserva.
 *
 * Reemplaza los inputs <time> "Hora inicio" / "Hora fin" por una
 * cuadrícula donde el usuario ve de un vistazo:
 *   - Verde claro: slot libre, clickeable
 *   - Gris oscuro: slot ocupado por otra reserva (PENDING o CONFIRMED)
 *   - Transparente: slot pasado, no clickeable
 *   - Magenta: slot seleccionado (start o middle del rango)
 *
 * Flujo de selección:
 *   1. Click en slot libre → set start (1h reserva por defecto)
 *   2. Click en otro slot libre posterior → extiende el end
 *   3. Click en el mismo slot → unselect
 *   4. Click en slot ocupado → no hace nada (visual feedback red flash)
 *
 * Los valores seleccionados se inyectan en inputs hidden con names
 * `startTime` y `endTime` (HH:mm) — el form action del padre los recibe
 * tal cual los recibía antes con inputs <time>.
 *
 * El componente NO valida lógica de negocio (eso es server-side en
 * `createBooking`). Aquí solo evita selecciones obviamente inválidas
 * (start después de end, solapamiento con ocupado).
 */

const HOUR_START = 8;
const HOUR_END = 21; // último slot = 20:00-21:00 → end válido = 21:00
const SLOT_HOURS = HOUR_END - HOUR_START; // 13 slots de 1h

type Booking = {
  startsAt: string; // ISO
  endsAt: string;
  status: "PENDING" | "CONFIRMED";
};

type SlotPickerProps = {
  /** Fecha seleccionada como YYYY-MM-DD (controlada por el padre vía Link). */
  date: string;
  /** Reservas existentes de la sala para esa fecha. */
  bookings: Booking[];
  /** Cuántas horas por defecto cuando hace primer click. */
  defaultDuration?: number;
};

export function SlotPicker({ date, bookings, defaultDuration = 2 }: SlotPickerProps) {
  // Estado interno: hora inicio + horas seleccionadas. Si null, sin selección.
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [errorFlash, setErrorFlash] = useState<number | null>(null);

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const isToday = date === todayISO;

  // Calcular set de horas ocupadas: cualquier hora del slot dentro de
  // un booking activo cuenta como ocupada.
  const occupied = useMemo(() => {
    const occ = new Set<number>();
    for (const b of bookings) {
      const s = new Date(b.startsAt);
      const e = new Date(b.endsAt);
      // Por cada slot de 1h, marcar si overlap con [s, e)
      for (let h = HOUR_START; h < HOUR_END; h++) {
        const slotStart = new Date(`${date}T${String(h).padStart(2, "0")}:00:00`);
        const slotEnd = new Date(`${date}T${String(h + 1).padStart(2, "0")}:00:00`);
        if (slotStart < e && slotEnd > s) {
          occ.add(h);
        }
      }
    }
    return occ;
  }, [bookings, date]);

  // Helper: ¿el rango [s, e) está limpio de slots ocupados?
  const rangeFree = (s: number, e: number): boolean => {
    for (let h = s; h < e; h++) {
      if (occupied.has(h)) return false;
    }
    return true;
  };

  // Helper: ¿el slot ha pasado ya (solo aplica si es hoy)?
  const isPast = (hour: number): boolean => {
    if (!isToday) return false;
    return hour <= now.getHours();
  };

  const handleClick = (hour: number) => {
    // Slot ocupado o pasado → feedback rojo breve, no selecciona
    if (occupied.has(hour) || isPast(hour)) {
      setErrorFlash(hour);
      setTimeout(() => setErrorFlash(null), 600);
      return;
    }

    // Primer click → selecciona [hour, hour + default)
    if (start === null) {
      const proposedEnd = Math.min(hour + defaultDuration, HOUR_END);
      // Si los slots intermedios están ocupados, recortar a la mayor
      // duración posible (mínimo 1h)
      let actualEnd = proposedEnd;
      for (let h = hour + 1; h < proposedEnd; h++) {
        if (occupied.has(h)) {
          actualEnd = h;
          break;
        }
      }
      setStart(hour);
      setEnd(actualEnd);
      return;
    }

    // Click en el mismo start → unselect
    if (hour === start) {
      setStart(null);
      setEnd(null);
      return;
    }

    // Click después del start actual → extender end (si el rango es free)
    if (hour > start) {
      const newEnd = hour + 1;
      if (rangeFree(start, newEnd)) {
        setEnd(newEnd);
        return;
      }
      // Si el rango choca, mostrar error en el slot que rompe
      for (let h = start; h < newEnd; h++) {
        if (occupied.has(h)) {
          setErrorFlash(h);
          setTimeout(() => setErrorFlash(null), 600);
          return;
        }
      }
    }

    // Click antes del start → cambiar start, mantener duración
    if (hour < start) {
      const proposedEnd = hour + (end! - start);
      if (rangeFree(hour, Math.min(proposedEnd, HOUR_END))) {
        setStart(hour);
        setEnd(Math.min(proposedEnd, HOUR_END));
        return;
      }
      // Fallback: 1h sola
      setStart(hour);
      setEnd(hour + 1);
    }
  };

  // Formato HH:mm para el input hidden y para mostrar
  const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;

  const durationH = start !== null && end !== null ? end - start : 0;

  return (
    <div>
      {/* Inputs hidden que recibe el server action */}
      <input
        type="hidden"
        name="startTime"
        value={start !== null ? fmt(start) : ""}
      />
      <input
        type="hidden"
        name="endTime"
        value={end !== null ? fmt(end) : ""}
      />

      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">
          <Clock size={14} className="mr-1 inline-block align-text-bottom" />
          Franja horaria
        </div>
        <div className="text-xs text-[var(--color-mute)]">
          {start !== null && end !== null
            ? `${fmt(start)} → ${fmt(end)} · ${durationH}h`
            : "Selecciona una franja libre"}
        </div>
      </div>

      {/* Grid de slots */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: SLOT_HOURS }).map((_, i) => {
          const h = HOUR_START + i;
          const past = isPast(h);
          const occ = occupied.has(h);
          const isStart = start === h;
          const isEnd = end !== null && h === end - 1;
          const inRange = start !== null && end !== null && h >= start && h < end;
          const flash = errorFlash === h;

          let className =
            "relative flex h-12 items-center justify-center rounded-lg border text-xs font-medium transition select-none ";
          if (flash) {
            className += "border-red-400 bg-red-100 text-red-700 animate-pulse";
          } else if (past) {
            className +=
              "border-[var(--color-line)] bg-transparent text-[var(--color-mute)]/40 cursor-not-allowed";
          } else if (occ) {
            className +=
              "border-[var(--color-line)] bg-[var(--color-paper-2)] text-[var(--color-mute)] line-through cursor-not-allowed";
          } else if (inRange) {
            className +=
              "border-[var(--color-coral-500)] bg-[var(--color-coral-500)] text-[var(--color-paper)] cursor-pointer";
          } else {
            className +=
              "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-100 cursor-pointer";
          }

          return (
            <button
              key={h}
              type="button"
              onClick={() => handleClick(h)}
              disabled={past || occ}
              className={className}
              aria-label={`${fmt(h)} a ${fmt(h + 1)} ${
                occ ? "ocupado" : past ? "pasado" : isStart ? "inicio seleccionado" : isEnd ? "fin seleccionado" : "libre"
              }`}
            >
              <span>{fmt(h)}</span>
              {isStart && (
                <span className="absolute -top-1.5 left-1 rounded-full bg-white px-1 text-[9px] font-bold text-[var(--color-coral-600)] shadow">
                  inicio
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-mute)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-emerald-200 bg-emerald-50" />
          Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border bg-[var(--color-paper-2)]" />
          Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-[var(--color-coral-500)] bg-[var(--color-coral-500)]" />
          Seleccionado
        </span>
      </div>

      {/* Helper text */}
      {start === null && (
        <p className="mt-3 text-xs text-[var(--color-mute)]">
          Tip: click en una hora libre. Por defecto reserva {defaultDuration}h. Para
          extender, click en una hora posterior.
        </p>
      )}
      {start !== null && (
        <button
          type="button"
          onClick={() => {
            setStart(null);
            setEnd(null);
          }}
          className="mt-3 text-xs text-[var(--color-mute)] underline underline-offset-2 hover:text-[var(--color-ink)]"
        >
          Limpiar selección
        </button>
      )}
    </div>
  );
}
