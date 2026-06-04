import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { content } from "@/lib/content";

/**
 * Cron endpoint — pide feedback humano 24h+ después de cada reserva COMPLETED.
 *
 * Filosofía Startidea: NO escala 1-10, una pregunta abierta. El email lleva
 * a /feedback/[token] (sin login) con un único textarea + submit.
 *
 * Cron del host:
 *   0 10 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" \
 *     https://hubstartidea.es/api/cron/feedback-request
 *
 * Frecuencia: 1×día a las 10:00 UTC. La ventana de elegibilidad es
 * permisiva (cualquier COMPLETED endsAt < now-24h sin Feedback), así
 * que si el cron se salta un día, se envía al día siguiente. No hay
 * doble envío porque el INSERT en Feedback marca el booking.
 *
 * Idempotencia: el `await prisma.feedback.create({ bookingId })` falla
 * con duplicate key si ya existe (porque bookingId es UNIQUE). Hacemos
 * un findMany previo filtrando `feedback: null` para no intentar.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hubstartidea.es";
const MAX_PER_RUN = 50; // si hay backlog grande, lo procesamos en varios días

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "resend-no-configurado" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Bookings COMPLETED hace ≥24h, sin Feedback todavía.
  // Limitamos a MAX_PER_RUN para evitar avalancha de emails si hay backlog.
  // No vamos más atrás de 30 días — si lleva tanto, ya no aporta nada.
  const minDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
      endsAt: { lt: cutoff, gt: minDate },
      feedback: null,
    },
    include: {
      user: { select: { email: true, name: true } },
    },
    orderBy: { endsAt: "desc" },
    take: MAX_PER_RUN,
  });

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ bookingId: string; error: string }> = [];

  for (const booking of candidates) {
    const room = content.rooms.find((r) => r.slug === booking.roomSlug);
    const roomName = room?.name || booking.roomSlug;
    const fmtDate = booking.startsAt.toLocaleString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    const firstName = (booking.user.name || booking.user.email.split("@")[0]).split(" ")[0];

    try {
      // Crear Feedback (lock idempotente: bookingId UNIQUE)
      const feedback = await prisma.feedback.create({
        data: { bookingId: booking.id },
      });

      const feedbackUrl = `${SITE_URL}/feedback/${feedback.token}`;

      await resend.emails.send({
        from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
        to: booking.user.email,
        subject: `¿Cómo te fue en ${roomName}?`,
        text: `Hola ${firstName},

Ayer estuviste trabajando en ${roomName} en el HUB. ¿Cómo te sentiste?

No te pedimos puntuación ni nada formal. Solo cuéntanos en un par de líneas qué tal te fue, qué echaste en falta, o cualquier cosa que quieras compartir. Lo leemos personalmente y nos ayuda a hacerlo mejor.

Responder (1 minuto): ${feedbackUrl}

Si prefieres no responder, ignora este email — no insistiremos.

— HUB Startidea`,
        html: `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4efe6;font-family:-apple-system,system-ui,sans-serif;color:#2a2a2a;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #ddd5c4;">
    <tr><td style="padding:32px 28px;">
      <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">
        <span style="color:#2a2a2a;">startidea</span><span style="color:#e63e73;">.</span>
      </div>
      <h1 style="font-size:24px;margin:24px 0 14px;font-weight:600;line-height:1.3;">Hola ${firstName} 👋</h1>
      <p style="font-size:15px;line-height:1.65;color:#444;margin:0 0 14px;">
        El ${fmtDate} estuviste trabajando en <strong>${roomName}</strong> en el HUB.
        ¿Cómo te fue?
      </p>
      <p style="font-size:15px;line-height:1.65;color:#444;margin:0 0 22px;">
        No te pedimos puntuación. Solo cuéntanos en un par de líneas qué tal te sentiste,
        qué echaste en falta o cualquier cosa que quieras compartir. Lo leemos
        personalmente y nos ayuda a hacerlo mejor.
      </p>
      <a href="${feedbackUrl}" style="display:inline-block;padding:14px 26px;background:#e63e73;color:#fff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:600;">Responder (1 min)</a>
      <p style="font-size:12px;line-height:1.55;color:#888;margin:24px 0 0;">
        Si prefieres no responder, ignora este email — no insistiremos.
      </p>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#fafafa;color:#999;font-size:12px;border-radius:0 0 14px 14px;">
      HUB Startidea · C/ Conde Cifuentes 33 · Granada · hubstartidea.es
    </td></tr>
  </table>
</body></html>`,
      });

      sent++;
    } catch (err) {
      // Si falla la creación Feedback (bookingId duplicate por race) o el envío
      // de email, lo dejamos para el próximo run. No bloqueamos el resto.
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ bookingId: booking.id, error: msg.slice(0, 200) });
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
