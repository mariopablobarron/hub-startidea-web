"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { isSlotAvailable, isWithinOpeningHours } from "./availability";
import { quotePrice } from "./pricing";
import { validateCoupon, redeemCoupon } from "./coupons";
import { sendTransferInstructionsEmail } from "@/lib/mail/transfer";
import { content, bookingRef } from "@/lib/content";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

/**
 * Guest checkout — visitor reserva sin tener cuenta previa.
 *
 * Flow:
 *  1. Visitor rellena form completo en /reservar (sala + slot + datos personales)
 *  2. Esta action busca/crea User con role=VISITOR (sin password)
 *  3. Crea Booking PENDING + Payment PENDING + Stripe Session en transaction
 *  4. Redirige a Stripe Checkout
 *  5. Webhook /api/webhooks/stripe confirma Payment→PAID y Booking→CONFIRMED
 *  6. Email post-pago lleva magic-link para que el visitor pueda volver a /me
 *
 * Si el email ya existe como User registrado, se reutiliza (no se sobreescribe
 * nada). El visitor recibirá los mismos emails que recibiría un user normal.
 *
 * Protección anti-spam: el Stripe Checkout es OBLIGATORIO. Sin pago, el
 * webhook 'checkout.session.expired' libera el slot (verificado 2026-05-28).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hubstartidea.es";

const guestSchema = z.object({
  roomSlug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  startTime: z.string().regex(/^\d{2}:00$/, "Reserva por horas completas (ej. 10:00)"),
  endTime: z.string().regex(/^\d{2}:00$/, "Reserva por horas completas (ej. 12:00)"),
  attendees: z.coerce.number().int().min(1).max(200).optional(),
  purpose: z.string().min(1, "Cuéntanos qué vas a hacer").max(500),
  notes: z.string().max(2000).optional(),
  paymentMethod: z.enum(["stripe", "transfer"]).default("stripe"),
  couponCode: z.string().max(40).optional(),

  // Datos del visitor
  guestEmail: z.string().email("Email inválido"),
  guestName: z.string().min(2, "Tu nombre, por favor").max(120),
  guestPhone: z.string().min(6, "Teléfono inválido").max(40).optional(),
});

export async function createGuestBookingAndCheckout(formData: FormData) {
  // 1. Validación de inputs (zod)
  let data: z.infer<typeof guestSchema>;
  try {
    data = guestSchema.parse({
      roomSlug: formData.get("roomSlug"),
      date: formData.get("date"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      attendees: formData.get("attendees") || undefined,
      purpose: formData.get("purpose"),
      notes: formData.get("notes") || undefined,
      paymentMethod: (formData.get("paymentMethod") as string) || "stripe",
      couponCode: formData.get("couponCode") || undefined,
      guestEmail: formData.get("guestEmail"),
      guestName: formData.get("guestName"),
      guestPhone: formData.get("guestPhone") || undefined,
    });
  } catch (e) {
    const msg = e instanceof z.ZodError
      ? e.issues[0]?.message || "Datos incompletos"
      : "Datos incompletos";
    redirect(`/reservar?error=${encodeURIComponent(msg)}`);
  }

  // 2. Validar sala existe + reservable
  const room = content.rooms.find((r) => r.slug === data.roomSlug);
  if (!room) {
    redirect(`/reservar?error=${encodeURIComponent(`Sala "${data.roomSlug}" no encontrada`)}`);
  }
  if (room!.bookable === false) {
    redirect(`/reservar?error=${encodeURIComponent("Esa sala no se reserva por horas")}`);
  }

  // 3. Validar slot
  const startsAt = new Date(`${data.date}T${data.startTime}:00`);
  const endsAt = new Date(`${data.date}T${data.endTime}:00`);
  if (endsAt <= startsAt) {
    redirect(`/reservar?error=${encodeURIComponent("La hora de fin debe ser posterior a la de inicio")}`);
  }
  if (!isWithinOpeningHours(startsAt, endsAt)) {
    redirect(`/reservar?error=${encodeURIComponent("Fuera del horario del HUB (08:00 - 21:00)")}`);
  }
  if (startsAt < new Date()) {
    redirect(`/reservar?error=${encodeURIComponent("No puedes reservar en el pasado")}`);
  }
  const available = await isSlotAvailable({
    roomSlug: data.roomSlug,
    startsAt,
    endsAt,
  });
  if (!available) {
    redirect(`/reservar?error=${encodeURIComponent("Ese horario ya está reservado. Prueba otro.")}`);
  }

  // 4. Calcular precio con role VISITOR (sin descuento de rol) + cupón si aplica
  const coupon = await validateCoupon(data.couponCode, data.roomSlug);
  const durationHours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
  const quote = await quotePrice({
    roomSlug: data.roomSlug,
    durationHours,
    role: "VISITOR",
    coupon,
  });
  if (quote.totalCents <= 0) {
    redirect(`/reservar?error=${encodeURIComponent("Esta sala no tiene tarifa configurada — escríbenos para coordinar")}`);
  }

  const isTransfer = data.paymentMethod === "transfer";

  // 5. Stripe configurado? (solo necesario para pago con tarjeta)
  if (!isTransfer && !isStripeConfigured()) {
    redirect(`/reservar?error=${encodeURIComponent("Pago no disponible ahora mismo — escríbenos a hola@hubstartidea.es")}`);
  }

  // 6. Buscar/crear User
  const existingUser = await prisma.user.findUnique({
    where: { email: data.guestEmail.toLowerCase() },
  });
  const user = existingUser ?? (await prisma.user.create({
    data: {
      email: data.guestEmail.toLowerCase(),
      name: data.guestName,
      phone: data.guestPhone,
      role: "VISITOR",
    },
  }));
  // Si user existía sin teléfono y el visitor lo aportó, completar
  if (existingUser && !existingUser.phone && data.guestPhone) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { phone: data.guestPhone },
    }).catch(() => {});
  }

  // 7. Crear Booking + Payment vinculados (transaction)
  const { booking, payment } = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        userId: user.id,
        roomSlug: data.roomSlug,
        startsAt,
        endsAt,
        attendees: data.attendees,
        purpose: data.purpose,
        notes: data.notes,
        totalCents: quote.totalCents,
        status: "PENDING",
        couponCode: quote.couponCode,
      },
    });
    const p = await tx.payment.create({
      data: {
        userId: user.id,
        amountCents: quote.totalCents,
        currency: "EUR",
        status: "PENDING",
        method: isTransfer ? "BANK_TRANSFER" : "STRIPE",
        description: `Reserva ${room!.name} — ${startsAt.toISOString().slice(0, 16).replace("T", " ")}`,
      },
    });
    await tx.booking.update({
      where: { id: b.id },
      data: { paymentId: p.id },
    });
    return { booking: b, payment: p };
  });

  // Consumir cupón si fue el descuento aplicado
  if (quote.couponCode) await redeemCoupon(quote.couponCode);

  // Rama TRANSFERENCIA: sin Stripe. Email con instrucciones + acceso a /me.
  if (isTransfer) {
    const manageUrl = `${SITE_URL}/login?email=${encodeURIComponent(data.guestEmail)}&callbackUrl=${encodeURIComponent("/me/reservas")}`;
    await sendTransferInstructionsEmail({
      to: data.guestEmail,
      name: data.guestName,
      roomName: room!.name,
      startsAt,
      durationHours,
      totalCents: quote.totalCents,
      reference: bookingRef(booking.id),
      manageUrl,
    });
    await notifyAdminTelegramGuestBooking({
      bookingId: booking.id,
      roomName: room!.name,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      startsAt,
      durationHours,
      totalCents: quote.totalCents,
      isNewUser: !existingUser,
      isTransfer: true,
    }).catch(() => {});
    redirect(`/reservar/gracias?id=${booking.id}`);
  }

  // 8. Crear Stripe Checkout Session
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: data.guestEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Reserva — ${room!.name}`,
            description: data.purpose,
          },
          unit_amount: quote.totalCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/reservar/gracias?id=${booking.id}`,
    cancel_url: `${SITE_URL}/reservar?cancelled=1&sala=${data.roomSlug}`,
    // Stripe Checkout expira a los 30 min si no se completa
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: {
      paymentId: payment.id,
      bookingId: booking.id,
      kind: "booking",
      guestFlow: "1", // marca para que webhook envíe magic-link
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  });

  // 9. Notificación Telegram al admin (reserva nueva PENDING)
  await notifyAdminTelegramGuestBooking({
    bookingId: booking.id,
    roomName: room!.name,
    guestName: data.guestName,
    guestEmail: data.guestEmail,
    guestPhone: data.guestPhone,
    startsAt,
    durationHours,
    totalCents: quote.totalCents,
    isNewUser: !existingUser,
  }).catch(() => {}); // no bloquea si falla

  // 10. Redirigir a Stripe Checkout
  redirect(session.url!);
}

async function notifyAdminTelegramGuestBooking(opts: {
  bookingId: string;
  roomName: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  startsAt: Date;
  durationHours: number;
  totalCents: number;
  isNewUser: boolean;
  isTransfer?: boolean;
}) {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) return;

  const fmtDate = opts.startsAt.toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const text = [
    `🆕 *Reserva guest ${opts.isTransfer ? "por transferencia (pendiente de ingreso)" : "iniciada (esperando pago)"}*`,
    ``,
    `🏢 Sala: ${opts.roomName}`,
    `🗓️ ${fmtDate} (${opts.durationHours.toFixed(1)}h)`,
    `👤 ${opts.guestName}${opts.isNewUser ? " *(nuevo)*" : ""}`,
    `📧 ${opts.guestEmail}`,
    opts.guestPhone ? `📱 ${opts.guestPhone}` : "",
    `💶 ${(opts.totalCents / 100).toFixed(2)}€`,
    ``,
    opts.isTransfer
      ? `_Estado: PENDING — marca "pago recibido" al ver la transferencia_\n[Ver en admin →](https://hubstartidea.es/admin/reservas)`
      : `_Estado: PENDING — se confirmará al pagar en Stripe (30 min)_`,
  ]
    .filter(Boolean)
    .join("\n");

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

/**
 * Email post-pago para guest: incluye magic-link de NextAuth para que
 * el visitor pueda acceder a /me/reservas sin password. Se invoca desde
 * el webhook handler cuando metadata.guestFlow === "1".
 *
 * Nota: NextAuth v5 maneja el envío del magic-link cuando llamas a
 * signIn("resend", { email }). Aquí construimos el flow manualmente
 * mandando un email custom con un link directo /api/auth/signin/resend
 * que prefilla el email — Resend send via NextAuth funciona igual.
 *
 * Más simple: mandamos directamente a /login con email prefillado;
 * NextAuth genera el magic-link al hacer submit.
 */
export async function sendGuestPostPaymentEmail(opts: {
  email: string;
  name: string;
  bookingId: string;
  roomName: string;
  startsAt: Date;
  totalCents: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const fmtDate = opts.startsAt.toLocaleString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const loginUrl = `${SITE_URL}/login?email=${encodeURIComponent(opts.email)}&callbackUrl=${encodeURIComponent("/me/reservas")}`;

  await resend.emails
    .send({
      from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
      to: opts.email,
      subject: `Reserva confirmada — ${opts.roomName}`,
      html: `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4efe6;font-family:-apple-system,system-ui,sans-serif;color:#2a2a2a;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #ddd5c4;">
    <tr><td style="padding:32px 28px;">
      <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">
        <span style="color:#2a2a2a;">startidea</span><span style="color:#e63e73;">.</span>
      </div>
      <h1 style="font-size:24px;margin:20px 0 12px;font-weight:600;line-height:1.2;">¡Tu reserva está confirmada! 🎉</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 12px;">Hola ${opts.name}, gracias por reservar.</p>
      <div style="margin:20px 0;padding:16px;background:#fafafa;border-radius:10px;font-size:14px;">
        <div><strong>Sala:</strong> ${opts.roomName}</div>
        <div><strong>Fecha:</strong> ${fmtDate}</div>
        <div><strong>Pagado:</strong> ${(opts.totalCents / 100).toFixed(2)}€</div>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#444;margin:16px 0 12px;">Si quieres gestionar tu reserva (cambiar o cancelar), accede aquí con tu email — no necesitas contraseña:</p>
      <a href="${loginUrl}" style="display:inline-block;padding:12px 22px;background:#e63e73;color:#fff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">Acceder a mis reservas</a>
      <p style="font-size:12px;color:#888;margin:20px 0 0;">Te enviaremos un email a este mismo correo con un enlace de un solo uso para entrar.</p>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#fafafa;color:#999;font-size:12px;border-radius:0 0 14px 14px;">
      HUB Startidea · C/ Conde Cifuentes 33 · Granada · hubstartidea.es
    </td></tr>
  </table>
</body></html>`,
      text: `Hola ${opts.name},

Tu reserva está confirmada:
- Sala: ${opts.roomName}
- Fecha: ${fmtDate}
- Pagado: ${(opts.totalCents / 100).toFixed(2)}€

Para gestionar tu reserva, accede aquí: ${loginUrl}
(No necesitas contraseña — te enviamos un enlace de un solo uso al email.)

— HUB Startidea`,
    })
    .catch(() => {});
}
