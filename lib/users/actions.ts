"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import type { MembershipType, Role } from "@prisma/client";

/**
 * Server actions del admin de usuarios.
 *
 * Todas las acciones:
 * 1. Validan que el caller sea ADMIN (requireAdmin).
 * 2. Validan input con zod.
 * 3. Crean entrada en AuditLog con actorId + action + target.
 * 4. Revalidan /admin/users.
 *
 * Patrón withFeedback redirige con ?saved=1 o ?error=... para
 * consistencia con el resto del admin.
 */

async function logAudit(opts: {
  actorId: string;
  actorEmail: string;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: opts.actorId,
      actorEmail: opts.actorEmail,
      action: opts.action,
      target: opts.target,
      metadata: opts.metadata as never,
    },
  });
}

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

// ============================================================
// Actualizar rol y membresía
// ============================================================

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["VISITOR", "CLIENT", "MEMBER", "COLLABORATOR", "ADMIN"]),
  membershipType: z.enum(["COWORKER_FIXED", "COWORKER_FLEX", "OFFICE_PRIVATE"]).optional().nullable(),
  membershipUntilISO: z.string().optional().nullable(),
  // Descuento personal: tipo (% o €) y valor introducido por el admin.
  discountKind: z.enum(["PERCENT", "FIXED"]).optional().nullable(),
  discountValueRaw: z.coerce.number().min(0).optional().nullable(),
});

export async function updateUserRole(formData: FormData) {
  return withFeedback("/admin/users", async () => {
    const admin = await requireAdmin();

    const data = updateRoleSchema.parse({
      userId: formData.get("userId"),
      role: formData.get("role"),
      membershipType: formData.get("membershipType") || null,
      membershipUntilISO: formData.get("membershipUntilISO") || null,
      discountKind: formData.get("discountKind") || null,
      discountValueRaw: formData.get("discountValue") || null,
    });

    // No permitir que el admin se quite a sí mismo el rol ADMIN — habría
    // que tener al menos otro admin antes.
    if (data.userId === admin.id && data.role !== "ADMIN") {
      throw new Error("No puedes quitarte el rol de ADMIN a ti mismo.");
    }

    const before = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { role: true, membershipType: true, email: true },
    });
    if (!before) throw new Error("Usuario no encontrado.");

    const membershipUntil = data.membershipUntilISO ? new Date(data.membershipUntilISO) : null;

    // Descuento personal: % se guarda tal cual (0-100); € se pasa a céntimos.
    // Si no hay tipo o el valor es 0, se limpia el descuento.
    let discountKind: "PERCENT" | "FIXED" | null = null;
    let discountValue: number | null = null;
    if (data.discountKind && data.discountValueRaw != null && data.discountValueRaw > 0) {
      discountKind = data.discountKind;
      discountValue =
        data.discountKind === "PERCENT"
          ? Math.min(100, Math.round(data.discountValueRaw))
          : Math.round(data.discountValueRaw * 100);
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        role: data.role as Role,
        membershipType: (data.membershipType as MembershipType) || null,
        membershipUntil,
        discountKind,
        discountValue,
      },
    });

    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "user.role_changed",
      target: data.userId,
      metadata: {
        from: { role: before.role, membershipType: before.membershipType },
        to: { role: data.role, membershipType: data.membershipType },
        targetEmail: before.email,
      },
    });

    revalidatePath("/admin/users");
  });
}

// ============================================================
// Invitar a un nuevo usuario por email (magic-link)
// ============================================================

const inviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(1).max(120),
  role: z.enum(["CLIENT", "MEMBER", "COLLABORATOR", "ADMIN"]),
  membershipType: z.enum(["COWORKER_FIXED", "COWORKER_FLEX", "OFFICE_PRIVATE"]).optional().nullable(),
  personalMessage: z.string().max(800).optional(),
});

export async function inviteUser(formData: FormData) {
  return withFeedback("/admin/users", async () => {
    const admin = await requireAdmin();

    const data = inviteSchema.parse({
      email: formData.get("email"),
      name: formData.get("name"),
      role: formData.get("role"),
      membershipType: formData.get("membershipType") || null,
      personalMessage: formData.get("personalMessage") || undefined,
    });

    // Upsert: si el email ya existe, actualizamos rol y nombre.
    // Si no, crear con role pre-asignado.
    const user = await prisma.user.upsert({
      where: { email: data.email },
      create: {
        email: data.email,
        name: data.name,
        role: data.role as Role,
        membershipType: (data.membershipType as MembershipType) || null,
      },
      update: {
        name: data.name,
        role: data.role as Role,
        membershipType: (data.membershipType as MembershipType) || null,
      },
    });

    // Enviar email de invitación con link a /login (el usuario verifica
    // por magic-link). No usamos signIn() server-side aquí porque la
    // primera acción del usuario debe ser ir al login él mismo —
    // sino el cookie de NextAuth se crearía en el admin, no en él.
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const personalNote = data.personalMessage
        ? `<div style="margin-top:16px;padding:16px;background:#fafafa;border-radius:10px;font-size:14px;line-height:1.55;color:#444;"><strong>${admin.name || "Mario"}</strong> dice:<br><br>${escapeHtml(data.personalMessage).replace(/\n/g, "<br>")}</div>`
        : "";

      await resend.emails.send({
        from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
        to: data.email,
        subject: `Te invitamos al HUB Startidea`,
        html: `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4efe6;font-family:-apple-system,system-ui,sans-serif;color:#2a2a2a;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #ddd5c4;">
    <tr><td style="padding:32px 28px;">
      <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">
        <span style="color:#2a2a2a;">startidea</span><span style="color:#e63e73;">.</span>
      </div>
      <h1 style="font-size:24px;margin:20px 0 12px;font-weight:600;line-height:1.2;">Hola ${escapeHtml(data.name.split(" ")[0])} 👋</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 12px;">Te hemos creado una cuenta en el HUB Startidea con rol <strong>${labelForRole(data.role)}</strong>.</p>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 24px;">Cuando entres podrás reservar salas, ver eventos privados y participar en la comunidad.</p>
      ${personalNote}
      <div style="margin-top:24px;">
        <a href="https://hubstartidea.es/login" style="display:inline-block;padding:14px 24px;background:#2a2a2a;color:#f4efe6;text-decoration:none;border-radius:999px;font-size:15px;font-weight:500;">Entrar al HUB</a>
      </div>
      <p style="font-size:13px;line-height:1.5;color:#999;margin:24px 0 0;">Te llegará un enlace de acceso al email cuando lo pidas (sin contraseña).</p>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#fafafa;color:#999;font-size:12px;border-radius:0 0 14px 14px;">
      HUB Startidea · C/ Conde Cifuentes 33 · Granada · hubstartidea.es
    </td></tr>
  </table>
</body></html>`,
        text: `Te invitamos al HUB Startidea\n\nRol: ${labelForRole(data.role)}\n\nEntra en https://hubstartidea.es/login y pide un enlace de acceso con tu email (${data.email}).\n\n${data.personalMessage || ""}\n\n— Mario, HUB Startidea`,
      });
    }

    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "user.invited",
      target: user.id,
      metadata: { email: data.email, role: data.role, membershipType: data.membershipType },
    });

    revalidatePath("/admin/users");
  });
}

function labelForRole(role: string): string {
  return {
    CLIENT: "Cliente",
    MEMBER: "Coworker",
    COLLABORATOR: "Colaborador",
    ADMIN: "Admin",
  }[role] || role;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
