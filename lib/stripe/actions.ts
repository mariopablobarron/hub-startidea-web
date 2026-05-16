"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/roles";
import { getStripe, isStripeConfigured, BOND_CATALOG } from "./client";
import { content } from "@/lib/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hubstartidea.es";

/**
 * Crea Stripe Checkout Session para pagar una reserva PENDING.
 *
 * Flow:
 *  1. User envía form en /me/reservas o /reservar/pagar/[bookingId]
 *  2. Server action verifica que el booking le pertenece y está PENDING
 *  3. Crea Payment con status=PENDING + asocia a Booking
 *  4. Crea Stripe Session con metadata.{paymentId, bookingId}
 *  5. Redirige al hosted checkout de Stripe
 *  6. Stripe llama al webhook /api/webhooks/stripe
 *  7. Webhook actualiza Payment→PAID y Booking→CONFIRMED
 */
export async function createCheckoutForBooking(formData: FormData) {
  const user = await requireAuth();
  if (!isStripeConfigured()) {
    redirect("/me/reservas?error=stripe-no-configurado");
  }

  const bookingId = String(formData.get("bookingId") || "");
  if (!bookingId) redirect("/me/reservas?error=falta-id");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: { select: { email: true } } },
  });

  if (!booking) redirect("/me/reservas?error=reserva-no-encontrada");
  if (booking!.userId !== user.id) redirect("/me/reservas?error=no-autorizado");
  if (booking!.status !== "PENDING") redirect("/me/reservas?error=ya-procesada");
  if (booking!.totalCents <= 0) redirect("/me/reservas?error=sin-importe");

  const room = content.rooms.find((r) => r.slug === booking!.roomSlug);

  // Crear Payment en BD antes de Stripe (idempotencia)
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amountCents: booking!.totalCents,
      currency: "EUR",
      status: "PENDING",
      description: `Reserva ${room?.name || booking!.roomSlug} — ${booking!.startsAt.toISOString()}`,
    },
  });
  await prisma.booking.update({
    where: { id: booking!.id },
    data: { paymentId: payment.id },
  });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking!.user.email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Reserva — ${room?.name || booking!.roomSlug}`,
            description: booking!.purpose || undefined,
          },
          unit_amount: booking!.totalCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/me/reservas?paid=1&id=${booking!.id}`,
    cancel_url: `${SITE_URL}/me/reservas?cancelled=1&id=${booking!.id}`,
    metadata: {
      paymentId: payment.id,
      bookingId: booking!.id,
      kind: "booking",
    },
  });

  // Persistir sessionId para idempotency check en webhook
  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  });

  redirect(session.url!);
}

/**
 * Crear Checkout Session para comprar un bono prepago.
 */
export async function createCheckoutForBond(formData: FormData) {
  const user = await requireAuth();
  if (!isStripeConfigured()) redirect("/me/bonos?error=stripe-no-configurado");

  const bondType = String(formData.get("bondType") || "");
  const item = BOND_CATALOG.find((b) => b.type === bondType);
  if (!item) redirect("/me/bonos?error=bono-no-encontrado");

  // Crear Payment + PrepaidBond (PENDING) — al webhook confirma
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amountCents: item!.priceCents,
      currency: "EUR",
      status: "PENDING",
      description: item!.name,
    },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + item!.expirationDays);

  await prisma.prepaidBond.create({
    data: {
      userId: user.id,
      type: item!.type,
      hoursTotal: item!.hoursTotal,
      expiresAt,
      paymentId: payment.id,
    },
  });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: item!.name, description: item!.description },
          unit_amount: item!.priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${SITE_URL}/me/bonos?paid=1`,
    cancel_url: `${SITE_URL}/me/bonos?cancelled=1`,
    metadata: {
      paymentId: payment.id,
      bondType: item!.type,
      kind: "bond",
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  });

  redirect(session.url!);
}
