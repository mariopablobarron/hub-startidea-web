"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import type { PricingUnit } from "@prisma/client";

/**
 * Server actions del editor de tarifas en BD.
 *
 * Cada fila en la tabla `Pricing` representa una tarifa por (sala, unidad)
 * con 3 precios (cliente / member / colaborador). Mario las edita aquí.
 *
 * Reglas:
 * - Solo ADMIN.
 * - Precios en BD se guardan en céntimos (Int). El form los muestra en
 *   euros con decimales — convertimos en zod coerce.
 * - Si todos los precios son null/0, marcamos la fila como inactive.
 */

async function withFeedback(
  redirectPath: string,
  fn: () => Promise<void>,
): Promise<never> {
  try {
    await fn();
  } catch (e: unknown) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    redirect(`${redirectPath}?error=${encodeURIComponent(msg.slice(0, 200))}`);
  }
  redirect(`${redirectPath}?saved=1`);
}

// Helper: convierte "47,50" o "47.50" en céntimos. Cadena vacía → null.
function eurosToCents(v: FormDataEntryValue | null): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

const upsertSchema = z.object({
  id: z.string().optional(),
  roomSlug: z.string().min(1),
  unit: z.enum(["PER_HOUR", "HALF_DAY", "FULL_DAY", "EVENT", "PER_SESSION", "PER_DAY"]),
  notes: z.string().max(500).optional().nullable(),
});

export async function upsertPricing(formData: FormData) {
  return withFeedback("/admin/tarifas", async () => {
    const admin = await requireAdmin();

    const meta = upsertSchema.parse({
      id: formData.get("id") || undefined,
      roomSlug: formData.get("roomSlug"),
      unit: formData.get("unit"),
      notes: formData.get("notes") || null,
    });

    const clientCents = eurosToCents(formData.get("clientEuros"));
    const memberCents = eurosToCents(formData.get("memberEuros"));
    const collaboratorCents = eurosToCents(formData.get("collaboratorEuros"));
    const active = formData.get("active") === "on";

    // Si los 3 son null → no tiene sentido, alertamos
    if (clientCents === null && memberCents === null && collaboratorCents === null) {
      throw new Error("Define al menos un precio (cliente, member o colaborador).");
    }

    await prisma.pricing.upsert({
      where: {
        roomSlug_unit: {
          roomSlug: meta.roomSlug,
          unit: meta.unit as PricingUnit,
        },
      },
      create: {
        roomSlug: meta.roomSlug,
        unit: meta.unit as PricingUnit,
        clientCents,
        memberCents,
        collaboratorCents,
        active,
        notes: meta.notes || null,
      },
      update: {
        clientCents,
        memberCents,
        collaboratorCents,
        active,
        notes: meta.notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "pricing.upserted",
        target: `${meta.roomSlug}/${meta.unit}`,
        metadata: { clientCents, memberCents, collaboratorCents, active } as never,
      },
    });

    revalidatePath("/admin/tarifas");
    revalidatePath("/reservar");
  });
}

export async function deletePricing(formData: FormData) {
  const id = String(formData.get("id") || "");
  return withFeedback("/admin/tarifas", async () => {
    const admin = await requireAdmin();
    if (!id) throw new Error("Falta id");
    const existing = await prisma.pricing.findUnique({ where: { id } });
    if (!existing) throw new Error("Tarifa no encontrada");
    await prisma.pricing.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "pricing.deleted",
        target: `${existing.roomSlug}/${existing.unit}`,
        metadata: {} as never,
      },
    });
    revalidatePath("/admin/tarifas");
    revalidatePath("/reservar");
  });
}
