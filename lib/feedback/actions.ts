"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { content } from "@/lib/content";

/**
 * Server action invocada desde /feedback/[token]. Guarda la respuesta
 * libre del user en Feedback.text + respondedAt, y notifica al admin
 * por Telegram con la respuesta entera (sin trim — queremos leerla
 * tal cual).
 *
 * Sin tracker ni auto-reply ni puntuación numérica. Honestidad
 * relacional Startidea: una pregunta abierta, lectura humana.
 */

const submitSchema = z.object({
  token: z.string().min(1),
  text: z.string().min(5, "Cuéntanos un poco más").max(5000),
});

export async function submitFeedback(formData: FormData) {
  let data: z.infer<typeof submitSchema>;
  try {
    data = submitSchema.parse({
      token: formData.get("token"),
      text: formData.get("text"),
    });
  } catch (e) {
    const msg = e instanceof z.ZodError
      ? e.issues[0]?.message || "Datos incompletos"
      : "Datos incompletos";
    const token = String(formData.get("token") || "");
    redirect(`/feedback/${token}?error=${encodeURIComponent(msg)}`);
  }

  const feedback = await prisma.feedback.findUnique({
    where: { token: data.token },
    include: {
      booking: {
        include: {
          user: { select: { email: true, name: true } },
        },
      },
    },
  });
  if (!feedback) {
    redirect("/?error=feedback-no-encontrado");
  }

  // Si ya respondió, no machacar. Solo redirigir a la pantalla de gracias.
  if (feedback!.respondedAt) {
    redirect(`/feedback/${data.token}?thanks=1`);
  }

  await prisma.feedback.update({
    where: { token: data.token },
    data: {
      text: data.text.trim(),
      respondedAt: new Date(),
    },
  });

  // Notif Telegram al admin con la respuesta entera. Sin truncar, sin
  // emoji-overload — texto humano, lectura humana.
  await notifyAdminFeedback({
    text: data.text.trim(),
    roomSlug: feedback!.booking.roomSlug,
    userName: feedback!.booking.user.name || feedback!.booking.user.email.split("@")[0],
    userEmail: feedback!.booking.user.email,
    bookingDate: feedback!.booking.startsAt,
  }).catch(() => {});

  revalidatePath("/admin/feedback");
  redirect(`/feedback/${data.token}?thanks=1`);
}

async function notifyAdminFeedback(opts: {
  text: string;
  roomSlug: string;
  userName: string;
  userEmail: string;
  bookingDate: Date;
}) {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) return;

  const roomName = content.rooms.find((r) => r.slug === opts.roomSlug)?.name ?? opts.roomSlug;
  const fmtDate = opts.bookingDate.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  // Telegram parse_mode=HTML — escapar lo justo. Si Mario quiere ver
  // el feedback con saltos de línea originales, mantenemos \n.
  const esc = (s: string) =>
    s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

  const text = [
    `💬 <b>Feedback de ${esc(opts.userName)}</b>`,
    `<i>${esc(roomName)} · ${fmtDate}</i>`,
    ``,
    esc(opts.text),
    ``,
    `<a href="mailto:${esc(opts.userEmail)}">Responder por email</a>`,
  ].join("\n");

  await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}
