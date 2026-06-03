import type { DiscountKind } from "@prisma/client";

/**
 * Motor de descuentos — lógica pura, sin IO (testeable en aislamiento).
 *
 * Política de producto (confirmada con Mario 2026-06-03):
 *  - Los descuentos NO se acumulan. Si concurren varios (rol, personal,
 *    cupón) se aplica el MÁS VENTAJOSO para el cliente.
 *  - Cada descuento puede ser PERCENT (0-100) o FIXED (céntimos).
 *  - Todo se aplica sobre la BASE IMPONIBLE (antes de IVA) y nunca deja
 *    la base por debajo de 0.
 *  - Empate de importe: gana cupón > personal > rol (orden de candidatos).
 */

export type DiscountInput = {
  kind: DiscountKind; // "PERCENT" | "FIXED"
  value: number; // PERCENT: 0-100 · FIXED: céntimos
};

export type DiscountSource = "role" | "personal" | "coupon";

export type DiscountCandidate = DiscountInput & {
  source: DiscountSource;
  code?: string; // solo cupones
};

export type AppliedDiscount = {
  source: DiscountSource;
  kind: DiscountKind;
  value: number;
  code?: string;
  /** Importe descontado en céntimos sobre la base imponible. */
  cents: number;
  /** % efectivo sobre la base (para UI / compatibilidad). */
  pct: number;
  /** Texto corto para UI: "−30%" o "−10,00 €". */
  label: string;
};

function formatEurosShort(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

/**
 * Importe en céntimos que un descuento aplica sobre una base imponible.
 * Clamp a [0, baseCents] — nunca descuenta más que la base.
 */
export function discountAmountCents(d: DiscountInput, baseCents: number): number {
  if (baseCents <= 0) return 0;
  if (d.kind === "PERCENT") {
    const pct = Math.min(100, Math.max(0, d.value));
    return Math.round((baseCents * pct) / 100);
  }
  // FIXED (céntimos)
  const fixed = Math.max(0, Math.round(d.value));
  return Math.min(fixed, baseCents);
}

/**
 * Elige el descuento más ventajoso para el cliente entre los candidatos.
 * Ignora candidatos nulos o con value<=0. Devuelve null si ninguno aplica.
 * En empate de importe gana el candidato que aparece ANTES en la lista
 * (pasar en orden cupón → personal → rol para que el cupón gane empates).
 */
export function chooseBestDiscount(
  candidates: Array<DiscountCandidate | null | undefined>,
  baseCents: number,
): AppliedDiscount | null {
  let best: AppliedDiscount | null = null;
  for (const c of candidates) {
    if (!c) continue;
    if (!(c.value > 0)) continue;
    const cents = discountAmountCents(c, baseCents);
    if (cents <= 0) continue;
    if (!best || cents > best.cents) {
      const pct = baseCents > 0 ? Math.round((cents / baseCents) * 100) : 0;
      const label =
        c.kind === "PERCENT"
          ? `−${Math.min(100, Math.max(0, c.value))}%`
          : `−${formatEurosShort(cents)}`;
      best = { source: c.source, kind: c.kind, value: c.value, code: c.code, cents, pct, label };
    }
  }
  return best;
}
