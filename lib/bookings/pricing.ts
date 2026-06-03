import { faq } from "@/lib/chat/faqShape";
import type { PricingUnit, Role, DiscountKind } from "@prisma/client";
import { chooseBestDiscount, type DiscountCandidate, type AppliedDiscount } from "./discount";

/**
 * Cálculo de precio para una reserva — fuente única de tarifas: faq.json.
 *
 * Histórico (2026-05-18 — Mario confirma tarifas reales):
 *   - 20€/hora base imponible (sin IVA) para las salas reservables.
 *   - IVA: 21% (servicios España).
 *   - Descuentos por rol: MEMBER -30%, COLLABORATOR -20%.
 *
 * Ampliación (2026-06-03):
 *   - Descuento personal por usuario (campos User.discountKind/discountValue).
 *   - Cupones / códigos promocionales (modelo Coupon).
 *   - Ambos pueden ser % o importe fijo (€). No se acumulan: se aplica el
 *     MÁS VENTAJOSO entre rol, personal y cupón. La matemática vive en
 *     ./discount.ts (pura y testeada); aquí solo se cablea con faq.json.
 *
 * Las cantidades en BD siguen siendo céntimos enteros — sin decimales.
 */

const VAT_RATE_PCT = (faq.tariffs as { vatRate?: number }).vatRate ?? 21;

export type PriceQuote = {
  unit: PricingUnit;
  durationHours: number;
  /** Tarifa por hora SIN IVA tras descuento (en céntimos). */
  baseHourCents: number;
  /** Base imponible total SIN descuento — para mostrar precio tachado. */
  baseCentsFull: number;
  /** Base imponible total tras descuento. */
  baseCents: number;
  /** IVA total en céntimos sobre baseCents. */
  vatCents: number;
  /** Total a cobrar (base + IVA) — esto es lo que se cobra. */
  totalCents: number;
  /** % efectivo de descuento sobre la base (0 si no hay). Compat UI. */
  discountPct: number;
  /** Importe de descuento aplicado, en céntimos. */
  discountCents: number;
  /** Origen del descuento aplicado, o null. */
  discountSource: AppliedDiscount["source"] | null;
  /** Texto corto del descuento para UI ("−30%", "−10,00 €"). */
  discountLabel: string | null;
  /** Código de cupón aplicado, si lo hubo. */
  couponCode: string | null;
  vatRatePct: number;
  quoted: boolean;
  reason?: string;
};

/**
 * Elige la unidad más eficiente para una duración dada.
 * Hoy solo PER_HOUR está activa; si Mario añade HALF_DAY/FULL_DAY a
 * faq.json, el cálculo se adapta sin tocar este archivo.
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
      // No tenemos por_día por sala en faq.json (es por coworking/office)
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
  /** Descuento personal del usuario (User.discountKind/discountValue). */
  personalDiscount?: { kind: DiscountKind; value: number } | null;
  /** Cupón ya validado (código + tipo + valor). */
  coupon?: { kind: DiscountKind; value: number; code?: string } | null;
}): Promise<PriceQuote> {
  const unit = chooseUnit(opts.durationHours, opts.unit);
  const zero = (reason: string): PriceQuote => ({
    unit,
    durationHours: opts.durationHours,
    baseHourCents: 0,
    baseCentsFull: 0,
    baseCents: 0,
    vatCents: 0,
    totalCents: 0,
    discountPct: 0,
    discountCents: 0,
    discountSource: null,
    discountLabel: null,
    couponCode: null,
    vatRatePct: VAT_RATE_PCT,
    quoted: reason === "admin",
    reason,
  });

  // Admin no paga (cortesía operativa)
  if (opts.role === "ADMIN") return zero("admin");

  // Tarifa base desde faq.json (fuente única)
  const baseEurosPerUnit = getBaseTariffEurosFromFaq(opts.roomSlug, unit);
  if (baseEurosPerUnit == null) return zero("no-pricing");

  const baseHourCentsFull = Math.round(baseEurosPerUnit * 100);
  const baseCentsFull =
    unit === "PER_HOUR" ? Math.round(baseHourCentsFull * opts.durationHours) : baseHourCentsFull;

  // Candidatos de descuento (orden = prioridad en empate): cupón > personal > rol
  const rolePct = discountPctForRole(opts.role);
  const candidates: Array<DiscountCandidate | null> = [
    opts.coupon
      ? { source: "coupon", kind: opts.coupon.kind, value: opts.coupon.value, code: opts.coupon.code }
      : null,
    opts.personalDiscount
      ? { source: "personal", kind: opts.personalDiscount.kind, value: opts.personalDiscount.value }
      : null,
    rolePct > 0 ? { source: "role", kind: "PERCENT", value: rolePct } : null,
  ];
  const best = chooseBestDiscount(candidates, baseCentsFull);

  const discountCents = best?.cents ?? 0;
  const baseCents = Math.max(0, baseCentsFull - discountCents);
  const vatCents = Math.round((baseCents * VAT_RATE_PCT) / 100);
  const totalCents = baseCents + vatCents;
  const baseHourCents =
    unit === "PER_HOUR" && opts.durationHours > 0
      ? Math.round(baseCents / opts.durationHours)
      : baseCents;

  return {
    unit,
    durationHours: opts.durationHours,
    baseHourCents,
    baseCentsFull,
    baseCents,
    vatCents,
    totalCents,
    discountPct: best?.pct ?? 0,
    discountCents,
    discountSource: best?.source ?? null,
    discountLabel: best?.label ?? null,
    couponCode: best?.source === "coupon" ? opts.coupon?.code ?? null : null,
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
