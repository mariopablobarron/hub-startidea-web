import { prisma } from "@/lib/db/prisma";
import type { PricingUnit, Role } from "@prisma/client";

/**
 * Cálculo de precio para una reserva.
 *
 * Estrategia:
 * 1. Determinar la unidad de precio (PER_HOUR, HALF_DAY, FULL_DAY, EVENT…)
 *    según la duración del slot solicitado.
 * 2. Buscar Pricing activo en BD para esa sala + unidad.
 * 3. Elegir el campo según rol: client/member/collaborator.
 * 4. Si rol = ADMIN o no hay Pricing válido, devolver 0 (cortesía).
 *
 * Las tarifas en BD están en céntimos. Múltiplos enteros — sin decimales
 * para evitar errores de redondeo.
 */

export type PriceQuote = {
  unit: PricingUnit;
  durationHours: number;
  unitPriceCents: number;
  totalCents: number;
  // Si no hay tarifa configurada, lo devolvemos como `quoted=false` para
  // que la UI muestre "Pendiente de confirmar" en lugar de €0,00.
  quoted: boolean;
  reason?: string;
};

/**
 * Elige la unidad más eficiente para una duración dada.
 * - <= 5 horas → PER_HOUR
 * - 5-7 horas → HALF_DAY (más barato)
 * - > 7 horas → FULL_DAY
 *
 * Para EVENT hay que solicitarlo explícitamente desde el form.
 */
export function chooseUnit(durationHours: number, override?: PricingUnit): PricingUnit {
  if (override) return override;
  if (durationHours <= 5) return "PER_HOUR";
  if (durationHours <= 7) return "HALF_DAY";
  return "FULL_DAY";
}

export async function quotePrice(opts: {
  roomSlug: string;
  durationHours: number;
  role: Role;
  unit?: PricingUnit;
}): Promise<PriceQuote> {
  const unit = chooseUnit(opts.durationHours, opts.unit);

  // Admin no paga
  if (opts.role === "ADMIN") {
    return {
      unit,
      durationHours: opts.durationHours,
      unitPriceCents: 0,
      totalCents: 0,
      quoted: true,
      reason: "admin",
    };
  }

  const pricing = await prisma.pricing.findUnique({
    where: { roomSlug_unit: { roomSlug: opts.roomSlug, unit } },
  });

  if (!pricing || !pricing.active) {
    return {
      unit,
      durationHours: opts.durationHours,
      unitPriceCents: 0,
      totalCents: 0,
      quoted: false,
      reason: "no-pricing",
    };
  }

  const unitCents =
    opts.role === "MEMBER"
      ? pricing.memberCents
      : opts.role === "COLLABORATOR"
        ? pricing.collaboratorCents
        : pricing.clientCents;

  if (!unitCents) {
    return {
      unit,
      durationHours: opts.durationHours,
      unitPriceCents: 0,
      totalCents: 0,
      quoted: false,
      reason: "no-rate-for-role",
    };
  }

  // PER_HOUR multiplica por horas. El resto son unidades cerradas
  // (medio día, día completo, evento, sesión) — un único cargo.
  const totalCents =
    unit === "PER_HOUR"
      ? Math.round(unitCents * opts.durationHours)
      : unitCents;

  return {
    unit,
    durationHours: opts.durationHours,
    unitPriceCents: unitCents,
    totalCents,
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
