"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth/roles";
import { isSlotAvailable, isWithinOpeningHours } from "./availability";
import { quotePrice, formatEuros } from "./pricing";
import { content } from "@/lib/content";
import type { BookingStatus } from "@prisma/client";

/**
 * Server actions de reservas.
 *
 * Flujo de estados:
 *   PENDING → CONFIRMED (admin aprueba o pago OK)
 *   PENDING → CANCELLED (admin rechaza o usuario cancela)
 *   CONFIRMED → CANCELLED (usuario o admin)
 *   CONFIRMED → COMPLETED (cron diario marca pasadas)
 *   CONFIRMED → NO_SHOW (admin marca manualmente)
 *
 * Autoreglas:
 * - MEMBER → status CONFIRMED inmediato (sin pago si totalCents=0).
 * - COLLABORATOR/CLIENT → status PENDING hasta aprobación de admin.
 * - ADMIN → CONFIRMED inmediato (booking interno).
 */

async function withFeedback(
  redirectPath: string,
  fn: () => Promise<{ redirectTo?: string } | void>,
): Promise<never> {
  try {
    const result = await fn();
    if (result?.redirectTo) redirect(result.redirectTo);
  } catch (e: unknown) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    redirect(`${redirectPath}?error=${encodeURIComponent(msg.slice(0, 200))}`);
  }
  redirect(`${redirectPath}?saved=1`);
}

// ============================================================
// Crear reserva
// ============================================================

const createSchema = z.object({
  roomSlug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Horas completas: HH:00 — rechazamos minutos 15, 30, 45
  startTime: z.string().regex(/^\d{2}:00$/, { message: "Reserva por horas completas (ej. 10:00)" }),
  endTime: z.string().regex(/^\d{2}:00$/, { message: "Reserva por horas completas (ej. 12:00)" }),
  attendees: z.coerce.number().int().min(1).max(200).optional(),
  purpose: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
});

export async function createBooking(formData: FormData) {
  return withFeedback("/reservar", async () => {
    const user = await requireAuth("/reservar");

    const data = createSchema.parse({
      roomSlug: formData.get("roomSlug"),
      date: formData.get("date"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      attendees: formData.get("attendees") || undefined,
      purpose: formData.get("purpose"),
      notes: formData.get("notes") || undefined,
    });

    // Verificar que la sala existe Y es reservable. Las salas marcadas
    // como bookable=false (aulas inactivas, coworking abierto) no se
    // pueden reservar por horas — solo a través de Mario o por bono.
    const room = content.rooms.find((r) => r.slug === data.roomSlug);
    if (!room) throw new Error(`Sala "${data.roomSlug}" no encontrada.`);
    if (room.bookable === false) {
      throw new Error(`La sala ${room.name} no se reserva por horas. Escríbenos para coordinar.`);
    }

    const startsAt = new Date(`${data.date}T${data.startTime}:00`);
    const endsAt = new Date(`${data.date}T${data.endTime}:00`);

    if (endsAt <= startsAt) {
      throw new Error("La hora de fin debe ser posterior a la de inicio.");
    }
    if (!isWithinOpeningHours(startsAt, endsAt)) {
      throw new Error("El horario está fuera del horario del HUB (08:00 - 21:00).");
    }
    if (startsAt < new Date()) {
      throw new Error("No puedes reservar en el pasado.");
    }

    const available = await isSlotAvailable({
      roomSlug: data.roomSlug,
      startsAt,
      endsAt,
    });
    if (!available) {
      throw new Error("Ese horario ya está reservado en esta sala. Prueba otro.");
    }

    const durationHours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
    const quote = await quotePrice({
      roomSlug: data.roomSlug,
      durationHours,
      role: user.role,
    });

    // Status inicial según rol
    const status: BookingStatus =
      user.role === "MEMBER" || user.role === "ADMIN" ? "CONFIRMED" : "PENDING";

    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        roomSlug: data.roomSlug,
        startsAt,
        endsAt,
        attendees: data.attendees,
        purpose: data.purpose,
        notes: data.notes,
        totalCents: quote.totalCents,
        status,
      },
    });

    // Notificaciones
    await Promise.all([
      notifyAdminTelegram({
        type: status === "CONFIRMED" ? "new-confirmed" : "new-pending",
        booking,
        roomName: room.name,
        userName: user.name || user.email,
        userEmail: user.email,
        durationHours,
        totalCents: quote.totalCents,
      }),
      notifyUserEmail({
        booking,
        roomName: room.name,
        userName: user.name || user.email.split("@")[0],
        userEmail: user.email,
        durationHours,
        totalCents: quote.totalCents,
        status,
      }),
    ]);

    revalidatePath("/admin/reservas");
    revalidatePath("/me");
    return { redirectTo: `/me/reservas?saved=1&id=${booking.id}` };
  });
}

// ============================================================
// Aprobar / Rechazar / Marcar no-show (admin)
// ============================================================

const adminActionSchema = z.object({
  bookingId: z.string().min(1),
  newStatus: z.enum(["CONFIRMED", "CANCELLED", "NO_SHOW"]),
  adminNotes: z.string().max(2000).optional(),
});

export async function changeBookingStatus(formData: FormData) {
  return withFeedback("/admin/reservas", async () => {
    const admin = await requireAdmin();

    const data = adminActionSchema.parse({
      bookingId: formData.get("bookingId"),
      newStatus: formData.get("newStatus"),
      adminNotes: formData.get("adminNotes") || undefined,
    });

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!booking) throw new Error("Reserva no encontrada.");

    await prisma.booking.update({
      where: { id: data.bookingId },
      data: {
        status: data.newStatus,
        adminNotes: data.adminNotes,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: `booking.${data.newStatus.toLowerCase()}`,
        target: data.bookingId,
        metadata: {
          fromStatus: booking.status,
          toStatus: data.newStatus,
          userEmail: booking.user.email,
        } as never,
      },
    });

    // Notificar al usuario del cambio
    const room = content.rooms.find((r) => r.slug === booking.roomSlug);
    await notifyUserEmail({
      booking: { ...booking, status: data.newStatus },
      roomName: room?.name || booking.roomSlug,
      userName: booking.user.name || booking.user.email.split("@")[0],
      userEmail: booking.user.email,
      durationHours: (booking.endsAt.getTime() - booking.startsAt.getTime()) / 3_600_000,
      totalCents: booking.totalCents,
      status: data.newStatus,
    }).catch(() => {});

    revalidatePath("/admin/reservas");
    revalidatePath("/me");
  });
}

// ============================================================
// Cancelar (usuario)
// ============================================================

export async function cancelOwnBooking(formData: FormData) {
  return withFeedback("/me/reservas", async () => {
    const user = await requireAuth();
    const bookingId = String(formData.get("bookingId") || "");
    if (!bookingId) throw new Error("Falta id de reserva.");

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new Error("Reserva no encontrada.");
    if (booking.userId !== user.id && user.role !== "ADMIN") {
      throw new Error("No puedes cancelar reservas de otra persona.");
    }
    if (booking.status === "CANCELLED" || booking.status === "COMPLETED" || booking.status === "NO_SHOW") {
      throw new Error("Esta reserva ya está cerrada.");
    }
    if (booking.startsAt < new Date()) {
      throw new Error("No se puede cancelar una reserva pasada.");
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/admin/reservas");
    revalidatePath("/me");
  });
}

// ============================================================
// Notificaciones (helpers internos)
// ============================================================

type BookingLite = {
  id: string;
  roomSlug: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
};

async function notifyAdminTelegram(opts: {
  type: "new-pending" | "new-confirmed";
  booking: BookingLite;
  roomName: string;
  userName: string;
  userEmail: string;
  durationHours: number;
  totalCents: number;
}) {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) return;

  const emoji = opts.type === "new-pending" ? "⏳" : "✅";
  const fmtDate = opts.booking.startsAt.toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const text = [
    `${emoji} *Nueva reserva ${opts.type === "new-pending" ? "PENDIENTE" : "confirmada"}*`,
    ``,
    `🏢 Sala: ${opts.roomName}`,
    `🗓️ ${fmtDate} (${opts.durationHours.toFixed(1)}h)`,
    `👤 ${opts.userName} — ${opts.userEmail}`,
    `💶 ${formatEuros(opts.totalCents)}`,
    ``,
    opts.type === "new-pending"
      ? `[Ver en admin →](https://hubstartidea.es/admin/reservas)`
      : `(Aprobación automática por rol)`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}

async function notifyUserEmail(opts: {
  booking: BookingLite;
  roomName: string;
  userName: string;
  userEmail: string;
  durationHours: number;
  totalCents: number;
  status: BookingStatus;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const statusLabel: Record<BookingStatus, string> = {
    PENDING: "pendiente de aprobación",
    CONFIRMED: "confirmada ✅",
    CANCELLED: "cancelada",
    COMPLETED: "completada",
    NO_SHOW: "marcada como no-show",
  };

  const fmtDate = opts.booking.startsAt.toLocaleString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
    to: opts.userEmail,
    subject: `Reserva ${statusLabel[opts.status]} — ${opts.roomName}`,
    html: `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4efe6;font-family:-apple-system,system-ui,sans-serif;color:#2a2a2a;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #ddd5c4;">
    <tr><td style="padding:32px 28px;">
      <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">
        <span style="color:#2a2a2a;">startidea</span><span style="color:#e63e73;">.</span>
      </div>
      <h1 style="font-size:24px;margin:20px 0 12px;font-weight:600;line-height:1.2;">Hola ${opts.userName} 👋</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 12px;">Tu reserva está <strong>${statusLabel[opts.status]}</strong>:</p>
      <div style="margin:20px 0;padding:16px;background:#fafafa;border-radius:10px;font-size:14px;">
        <div><strong>Sala:</strong> ${opts.roomName}</div>
        <div><strong>Fecha:</strong> ${fmtDate}</div>
        <div><strong>Duración:</strong> ${opts.durationHours.toFixed(1)}h</div>
        ${opts.totalCents > 0 ? `<div><strong>Total:</strong> ${formatEuros(opts.totalCents)}</div>` : ""}
      </div>
      <a href="https://hubstartidea.es/me/reservas" style="display:inline-block;padding:12px 22px;background:#2a2a2a;color:#f4efe6;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">Ver mis reservas</a>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#fafafa;color:#999;font-size:12px;border-radius:0 0 14px 14px;">
      HUB Startidea · C/ Conde Cifuentes 33 · Granada · hubstartidea.es
    </td></tr>
  </table>
</body></html>`,
    text: `Hola ${opts.userName},\n\nTu reserva está ${statusLabel[opts.status]}.\n\nSala: ${opts.roomName}\nFecha: ${fmtDate}\nDuración: ${opts.durationHours.toFixed(1)}h\n${opts.totalCents > 0 ? `Total: ${formatEuros(opts.totalCents)}\n` : ""}\nVer en https://hubstartidea.es/me/reservas\n\n— HUB Startidea`,
  });
}
