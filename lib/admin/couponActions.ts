"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { normalizeCouponCode } from "@/lib/bookings/coupons";

/**
 * CRUD de cupones / códigos promocionales (admin).
 * Los cupones viven en BD (no en content.json), así que no hay commit ni
 * redeploy: basta prisma + revalidate de /admin/cupones y /reservar.
 */

async function withFeedback(redirectPath: string, fn: () => Promise<void>): Promise<never> {
  try {
    await fn();
  } catch (e: unknown) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    redirect(`${redirectPath}?error=${encodeURIComponent(msg.slice(0, 200))}`);
  }
  redirect(`${redirectPath}?saved=1`);
}

const createSchema = z.object({
  code: z.string().min(2, "El código es demasiado corto").max(40),
  kind: z.enum(["PERCENT", "FIXED"]),
  valueRaw: z.coerce.number().positive("El valor debe ser mayor que 0"),
  expiresAtISO: z.string().optional().nullable(),
  maxRedemptions: z.coerce.number().int().positive().optional().nullable(),
  roomSlug: z.string().optional().nullable(),
});

export async function createCoupon(formData: FormData) {
  return withFeedback("/admin/cupones", async () => {
    await requireAdmin();
    const data = createSchema.parse({
      code: formData.get("code"),
      kind: formData.get("kind"),
      valueRaw: formData.get("value"),
      expiresAtISO: formData.get("expiresAtISO") || null,
      maxRedemptions: formData.get("maxRedemptions") || null,
      roomSlug: formData.get("roomSlug") || null,
    });

    const code = normalizeCouponCode(data.code);
    // % se guarda tal cual (0-100); € se convierte a céntimos.
    const value =
      data.kind === "PERCENT"
        ? Math.min(100, Math.round(data.valueRaw))
        : Math.round(data.valueRaw * 100);

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new Error(`Ya existe un cupón con el código ${code}.`);

    await prisma.coupon.create({
      data: {
        code,
        kind: data.kind,
        value,
        expiresAt: data.expiresAtISO ? new Date(data.expiresAtISO) : null,
        maxRedemptions: data.maxRedemptions ?? null,
        roomSlug: data.roomSlug || null,
      },
    });

    revalidatePath("/admin/cupones");
  });
}

export async function toggleCoupon(formData: FormData) {
  return withFeedback("/admin/cupones", async () => {
    await requireAdmin();
    const id = String(formData.get("couponId") || "");
    const c = await prisma.coupon.findUnique({ where: { id } });
    if (!c) throw new Error("Cupón no encontrado.");
    await prisma.coupon.update({ where: { id }, data: { active: !c.active } });
    revalidatePath("/admin/cupones");
  });
}

export async function deleteCoupon(formData: FormData) {
  return withFeedback("/admin/cupones", async () => {
    await requireAdmin();
    const id = String(formData.get("couponId") || "");
    await prisma.coupon.delete({ where: { id } }).catch(() => {
      throw new Error("No se pudo borrar el cupón.");
    });
    revalidatePath("/admin/cupones");
  });
}
