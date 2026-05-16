import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { getStripe } from "@/lib/stripe/client";

/**
 * Webhook de Stripe — endpoint que recibe eventos de pago.
 *
 * Eventos manejados:
 * - checkout.session.completed → marca Payment PAID y Booking CONFIRMED
 *   (o activa el PrepaidBond si era una compra de bono)
 *
 * Seguridad:
 * - Verifica firma con STRIPE_WEBHOOK_SECRET (HMAC).
 * - Idempotencia: si el Payment ya está PAID, no procesa de nuevo.
 *
 * Para activar: en Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   URL: https://hubstartidea.es/api/webhooks/stripe
 *   Eventos: checkout.session.completed, checkout.session.expired
 *   Copia el "Signing secret" y lo metes en Coolify como STRIPE_WEBHOOK_SECRET.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    console.warn("[stripe-webhook] missing signature or secret");
    return NextResponse.json({ error: "missing-signature-or-secret" }, { status: 400 });
  }

  const stripe = getStripe();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] signature verification failed:", msg);
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }
      default:
        // Otros eventos los ignoramos por ahora
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] handler failed:", err);
    // Devolver 500 hace que Stripe reintente — solo si es un error transitorio
    return NextResponse.json({ error: "handler-failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.paymentId;
  const kind = session.metadata?.kind;
  if (!paymentId) {
    console.warn("[stripe-webhook] checkout.session.completed sin paymentId en metadata");
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { bookings: true, bondPurchase: true },
  });
  if (!payment) {
    console.warn("[stripe-webhook] payment no encontrado:", paymentId);
    return;
  }

  // Idempotency — si ya estaba PAID, no hacemos nada
  if (payment.status === "PAID") {
    console.log("[stripe-webhook] payment ya PAID, skip:", paymentId);
    return;
  }

  // Actualizar Payment + extraer PaymentIntent id
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : null;
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "PAID",
      stripePaymentIntentId: pi || undefined,
    },
  });

  // Confirmar Booking asociada
  if (kind === "booking") {
    for (const booking of payment.bookings) {
      if (booking.status === "PENDING") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "CONFIRMED" },
        });
      }
    }
    await notifyAdminTelegram(
      "💶 Reserva pagada",
      `Payment ${paymentId} → CONFIRMED · ${payment.amountCents / 100}€`,
    );
  }

  // Activar PrepaidBond
  if (kind === "bond" && payment.bondPurchase) {
    // El bono ya está creado en BD desde la action; el pago lo activa.
    // No requiere cambio de estado en PrepaidBond — su existencia con
    // payment.status=PAID equivale a "activo".
    await notifyAdminTelegram(
      "🎟️ Bono comprado",
      `${payment.bondPurchase.type} · ${payment.amountCents / 100}€`,
    );
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.paymentId;
  if (!paymentId) return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED" },
  }).catch(() => {});

  // Si era de un Booking, lo cancelamos para liberar el slot
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { bookings: true, bondPurchase: true },
  });
  if (payment) {
    for (const booking of payment.bookings) {
      if (booking.status === "PENDING") {
        await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
      }
    }
    if (payment.bondPurchase) {
      // Borrar el bono pendiente
      await prisma.prepaidBond.delete({ where: { id: payment.bondPurchase.id } }).catch(() => {});
    }
  }
}

async function notifyAdminTelegram(title: string, body: string) {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) return;
  await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text: `*${title}*\n\n${body}`,
      parse_mode: "Markdown",
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}
