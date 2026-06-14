"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/roles";
import { ACCESS_LABEL } from "./access-labels";
import type { AccessType } from "@prisma/client";

/**
 * Control de acceso físico al HUB — alta/baja de tenedores de llave.
 *
 * Filosofía: registro DOCUMENTAL, no cerradura electrónica. Sirve para
 * que en cualquier momento se sepa QUIÉN puede entrar, con qué medio
 * (llave, código, tarjeta…), desde cuándo y quién lo autorizó.
 *
 * Nunca se borra una fila: dar de baja = status REVOKED + fecha + motivo.
 * Así queda histórico completo (auditoría real, no "control" de boquilla).
 */

const ACCESS_TYPES = [
  "PHYSICAL_KEY",
  "ALARM_CODE",
  "ACCESS_CARD",
  "GARAGE_REMOTE",
  "BUILDING_KEY",
  "OTHER",
] as const;

const createSchema = z.object({
  name: z.string().min(2, "Nombre obligatorio").max(120),
  email: z.string().email("Email inválido").max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  accessType: z.enum(ACCESS_TYPES).default("PHYSICAL_KEY"),
  identifier: z.string().max(80).optional().or(z.literal("")),
  role: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }
  return user;
}

async function withFeedback(fn: () => Promise<void>): Promise<never> {
  try {
    await fn();
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    redirect(`/admin/llaves?error=${encodeURIComponent(msg.slice(0, 200))}`);
  }
  redirect("/admin/llaves?saved=1");
}

export async function createKeyHolder(formData: FormData) {
  return withFeedback(async () => {
    const admin = await requireAdminUser();
    const data = createSchema.parse({
      name: formData.get("name"),
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      accessType: (formData.get("accessType") as string) || "PHYSICAL_KEY",
      identifier: formData.get("identifier") || undefined,
      role: formData.get("role") || undefined,
      notes: formData.get("notes") || undefined,
    });

    // Si el email coincide con un User del HUB, lo vinculamos (informativo).
    let userId: string | null = null;
    if (data.email) {
      const u = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        select: { id: true },
      });
      userId = u?.id ?? null;
    }

    const kh = await prisma.keyHolder.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        userId,
        accessType: data.accessType as AccessType,
        identifier: data.identifier || null,
        role: data.role || null,
        notes: data.notes || null,
        status: "ACTIVE",
        grantedBy: admin.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "keyholder.granted",
        target: kh.id,
        metadata: { name: data.name, accessType: data.accessType, identifier: data.identifier } as never,
      },
    });

    await notifyTelegram(
      "🔑 Alta de acceso al HUB",
      [
        `*${esc(data.name)}*${data.role ? ` · ${esc(data.role)}` : ""}`,
        `Acceso: ${ACCESS_LABEL[data.accessType as AccessType]}`,
        data.identifier ? `Ref: ${esc(data.identifier)}` : "",
        `Autorizado por: ${esc(admin.email)}`,
      ].filter(Boolean).join("\n"),
    ).catch(() => {});

    revalidatePath("/admin/llaves");
  });
}

const revokeSchema = z.object({
  id: z.string().min(1),
  reason: z.string().max(500).optional().or(z.literal("")),
});

export async function revokeKeyHolder(formData: FormData) {
  return withFeedback(async () => {
    const admin = await requireAdminUser();
    const data = revokeSchema.parse({
      id: formData.get("id"),
      reason: formData.get("reason") || undefined,
    });

    const kh = await prisma.keyHolder.findUnique({ where: { id: data.id } });
    if (!kh) throw new Error("Registro no encontrado");
    if (kh.status === "REVOKED") throw new Error("Ya estaba dado de baja");

    await prisma.keyHolder.update({
      where: { id: data.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: admin.email,
        revokeReason: data.reason || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "keyholder.revoked",
        target: kh.id,
        metadata: { name: kh.name, reason: data.reason } as never,
      },
    });

    await notifyTelegram(
      "🚫 Baja de acceso al HUB",
      [
        `*${esc(kh.name)}*`,
        `Acceso retirado: ${ACCESS_LABEL[kh.accessType]}`,
        data.reason ? `Motivo: ${esc(data.reason)}` : "",
        `Por: ${esc(admin.email)}`,
      ].filter(Boolean).join("\n"),
    ).catch(() => {});

    revalidatePath("/admin/llaves");
  });
}

/** Reactivar un acceso dado de baja (p.ej. volvió a recibir la llave). */
export async function reactivateKeyHolder(formData: FormData) {
  return withFeedback(async () => {
    const admin = await requireAdminUser();
    const id = String(formData.get("id") || "");
    if (!id) throw new Error("Falta id");

    const kh = await prisma.keyHolder.findUnique({ where: { id } });
    if (!kh) throw new Error("Registro no encontrado");

    await prisma.keyHolder.update({
      where: { id },
      data: { status: "ACTIVE", revokedAt: null, revokedBy: null, revokeReason: null, grantedAt: new Date(), grantedBy: admin.email },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "keyholder.reactivated",
        target: id,
        metadata: { name: kh.name } as never,
      },
    });

    revalidatePath("/admin/llaves");
  });
}

// ── helpers ──────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/[_*[\]()~`>#+=|{}.!-]/g, (c) => "\\" + c);
}

async function notifyTelegram(title: string, body: string) {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) return;
  const text = `${title}\n\n${body}`;
  await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "MarkdownV2", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}
