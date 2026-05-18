import { faq } from "@/lib/chat/faqShape";
import type { PricingUnit, Role } from "@prisma/client";

/**
 * Cálculo de precio para una reserva — fuente única: faq.json.
 *
 * Histórico (2026-05-18 — Mario confirma tarifas reales):
 *   - 20€/hora base imponible (sin IVA) para las 5 salas reservables
 *     (CC33, Serendipia, Sócrates, Estudio Podcast, Office Privado).
 *   - IVA: 21% (servicios España).
 *   - Descuentos: MEMBER -30%, COLLABORATOR -20%, sobre la base ANTES del IVA.
 *
 * Antes: tarifas vivían en el modelo Prisma `Pricing` con seed placeholder.
 * Ahora: leemos directamente de `faq.tariffs.rooms[slug]` para que el
 * chatbot y el booking system muestren la misma cifra siempre.
 *
 * El modelo Prisma `Pricing` queda como legacy (no se borra para no
 * romper schema mientras dura el sistema custom; muere en Cal.com Fase 6).
 * `/admin/tarifas` se marca como deprecated y apunta a `/admin/faq`.
 *
 * Las cantidades en BD siguen siendo céntimos enteros — sin decimales.
 */

const VAT_RATE_PCT = (faq.tariffs as { vatRate?: number }).vatRate ?? 21;

export type PriceQuote = {
  unit: PricingUnit;
  durationHours: number;
  /** Tarifa por hora SIN IVA (en céntimos). */
  baseHourCents: number;
  /** Base imponible total (= baseHourCents × hours) en céntimos. */
  baseCents: number;
  /** IVA total en céntimos (21% sobre baseCents). */
  vatCents: number;
  /** Total a cobrar (base + IVA) — esto es lo que Stripe carga. */
  totalCents: number;
  /** Descuento aplicado por rol, en %. 0 si no hay. */
  discountPct: number;
  vatRatePct: number;
  quoted: boolean;
  reason?: string;
};

/**
 * Elige la unidad más eficiente para una duración dada.
 * - <= 5 horas → PER_HOUR
 * - 5-7 horas → HALF_DAY (cuando haya tarifa)
 * - > 7 horas → FULL_DAY (cuando haya tarifa)
 *
 * Hoy solo tenemos PER_HOUR activa. Si Mario añade HALF_DAY/FULL_DAY a
 * faq.json en el futuro, el cálculo se adapta sin tocar este archivo.
 */
export function chooseUnit(durationHours: number, override?: PricingUnit): PricingUnit {
  if (override) return override;
  if (durationHours <= 5) return "PER_HOUR";
  if (durationHours <= 7) return "HALF_DAY";
  return "FULL_DAY";
}

/**
 * Devuelve la tarifa base (sin IVA, sin descuento) según unidad.
 * Si no hay tarifa configurada en faq.json, devuelve null.
 */
function getBaseTariffEurosFromFaq(roomSlug: string, unit: PricingUnit): number | null {
  const room = (faq.tariffs.rooms as Record<string, Record<string, unknown>>)[roomSlug];
  if (!room) return null;
  switch (unit) {
    case "PER_HOUR":
      return typeof room.perHour === "number" ? room.perHour : null;
    case "HALF_DAY":
      return typeof room.halfDay === "number" ? room.halfDay : null;
    case "FULL_DAY":
      return typeof room.fullDay === "number" ? room.fullDay : null;
    case "EVENT":
      return typeof room.event === "number" ? room.event : null;
    case "PER_SESSION":
      return typeof room.session2h === "number" ? room.session2h : null;
    case "PER_DAY":
      // No tenemos por_día por sala en faq.json (es por coworking abierto/office)
      return null;
  }
  return null;
}

function discountPctForRole(role: Role): number {
  if (role === "MEMBER") return 30;
  if (role === "COLLABORATOR") return 20;
  return 0;
}

export async function quotePrice(opts: {
  roomSlug: string;
  durationHours: number;
  role: Role;
  unit?: PricingUnit;
}): Promise<PriceQuote> {
  const unit = chooseUnit(opts.durationHours, opts.unit);
  const zero = (reason: string): PriceQuote => ({
    unit,
    durationHours: opts.durationHours,
    baseHourCents: 0,
    baseCents: 0,
    vatCents: 0,
    totalCents: 0,
    discountPct: 0,
    vatRatePct: VAT_RATE_PCT,
    quoted: reason === "admin",
    reason,
  });

  // Admin no paga (cortesía operativa)
  if (opts.role === "ADMIN") return zero("admin");

  // Tarifa base desde faq.json (fuente única)
  const baseEurosPerUnit = getBaseTariffEurosFromFaq(opts.roomSlug, unit);
  if (baseEurosPerUnit == null) return zero("no-pricing");

  const discountPct = discountPctForRole(opts.role);
  const baseHourCentsFull = Math.round(baseEurosPerUnit * 100);
  const baseHourCentsAfterDiscount = Math.round(baseHourCentsFull * (1 - discountPct / 100));

  // PER_HOUR multiplica por horas. Resto = unidad cerrada (un cargo).
  const baseCents =
    unit === "PER_HOUR"
      ? Math.round(baseHourCentsAfterDiscount * opts.durationHours)
      : baseHourCentsAfterDiscount;

  const vatCents = Math.round((baseCents * VAT_RATE_PCT) / 100);
  const totalCents = baseCents + vatCents;

  return {
    unit,
    durationHours: opts.durationHours,
    baseHourCents: baseHourCentsAfterDiscount,
    baseCents,
    vatCents,
    totalCents,
    discountPct,
    vatRatePct: VAT_RATE_PCT,
    quoted: true,
  };
}

/** Formato €123,45 desde céntimos. */
export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Etiquetas para PricingUnit. */
export const UNIT_LABEL: Record<PricingUnit, string> = {
  PER_HOUR: "Por hora",
  HALF_DAY: "Media jornada",
  FULL_DAY: "Jornada completa",
  EVENT: "Evento",
  PER_SESSION: "Por sesión",
  PER_DAY: "Por día",
};
