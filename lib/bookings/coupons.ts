import { prisma } from "@/lib/db/prisma";
import type { DiscountKind } from "@prisma/client";

/**
 * Validación y consumo de cupones / códigos promocionales.
 *
 * Un cupón es usable si: existe, está activo, no ha caducado, le quedan
 * usos disponibles y (si está restringido a una sala) coincide con la
 * sala reservada. La validación NUNCA lanza: si el código no aplica,
 * devuelve null y la reserva sigue su curso sin ese descuento.
 */

export type ValidatedCoupon = { code: string; kind: DiscountKind; value: number };

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export async function validateCoupon(
  rawCode: string | null | undefined,
  roomSlug: string,
): Promise<ValidatedCoupon | null> {
  if (!rawCode) return null;
  const code = normalizeCouponCode(rawCode);
  if (!code) return null;

  const c = await prisma.coupon.findUnique({ where: { code } });
  if (!c) return null;
  if (!c.active) return null;
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) return null;
  if (c.maxRedemptions != null && c.redemptions >= c.maxRedemptions) return null;
  if (c.roomSlug && c.roomSlug !== roomSlug) return null;
  if (!(c.value > 0)) return null;

  return { code: c.code, kind: c.kind, value: c.value };
}

/** Incrementa el contador de usos de un cupón (best-effort, no bloquea). */
export async function redeemCoupon(code: string): Promise<void> {
  await prisma.coupon
    .update({
      where: { code: normalizeCouponCode(code) },
      data: { redemptions: { increment: 1 } },
    })
    .catch(() => {});
}
