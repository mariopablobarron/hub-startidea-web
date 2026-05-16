import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { content } from "@/lib/content";

/**
 * Cron endpoint — recordatorio email 24h antes de cada evento publicado.
 *
 * Para activar: cron en VPS que llame a este endpoint cada hora con
 * `Authorization: Bearer $CRON_SECRET`. El secret evita que cualquiera
 * dispare emails masivos.
 *
 * El cron del host:
 *   0 * * * * curl -sf -H "Authorization: Bearer $SECRET" \
 *     https://hubstartidea.es/api/cron/event-reminders
 *
 * Ventana: eventos que arrancan entre [ahora + 23h, ahora + 25h]. Si el
 * cron corre cada hora, cada evento entra UNA vez en esa ventana.
 *
 * Idempotencia: usamos un campo `reminderSentAt` en EventRegistration
 * (lo añadimos por SQL si hace falta — por ahora marcamos con notes
 * para no tocar schema en esta fase final).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "resend-not-configured", sent: 0 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 3600 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 3600 * 1000);

  // Eventos en ventana
  const events = await prisma.event.findMany({
    where: {
      published: true,
      startsAt: { gte: windowStart, lt: windowEnd },
    },
    include: {
      registrations: {
        where: { status: "REGISTERED" },
        select: { id: true, email: true, name: true, notes: true },
      },
    },
  });

  if (events.length === 0) {
    return NextResponse.json({ sent: 0, events: 0, ts: now.toISOString() });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;

  for (const event of events) {
    const room = event.roomSlug ? content.rooms.find((r) => r.slug === event.roomSlug) : null;
    const where = room
      ? `${room.name} — ${content.site.address.street}`
      : event.externalLocation || content.site.address.street;

    for (const reg of event.registrations) {
      // Idempotency simple: si notes contiene "REMINDER_24H_SENT", skip
      if (reg.notes?.includes("REMINDER_24H_SENT")) continue;

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
          to: reg.email,
          subject: `Mañana: ${event.title}`,
          html: `<!doctype html><html lang="es"><body style="font-family:system-ui;padding:24px;background:#f4efe6;color:#2a2a2a;">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:14px;">
  <div style="font-size:24px;font-weight:700;letter-spacing:-0.02em;"><span>startidea</span><span style="color:#e63e73;">.</span></div>
  <h1 style="font-size:22px;margin-top:20px;">¡Mañana nos vemos! 👋</h1>
  <p style="font-size:15px;color:#444;line-height:1.6;">Te recordamos tu inscripción a:</p>
  <div style="margin:16px 0;padding:16px;background:#fafafa;border-radius:10px;">
    <div style="font-weight:600;font-size:17px;">${event.title}</div>
    <div style="margin-top:8px;color:#666;font-size:14px;">📅 ${event.startsAt.toLocaleString("es-ES", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}</div>
    <div style="color:#666;font-size:14px;">📍 ${where}</div>
  </div>
  <a href="https://hubstartidea.es/eventos/${event.slug}" style="display:inline-block;padding:10px 18px;background:#2a2a2a;color:#f4efe6;text-decoration:none;border-radius:999px;font-size:14px;">Ver detalle</a>
  <p style="margin-top:20px;font-size:13px;color:#999;">Si no puedes venir, escríbenos a hola@hubstartidea.es.</p>
</div></body></html>`,
          text: `Mañana: ${event.title}\n\n${event.startsAt.toLocaleString("es-ES")}\n${where}\n\nVer: https://hubstartidea.es/eventos/${event.slug}`,
        });

        // Marcar como enviado (anexar marca a notes)
        await prisma.eventRegistration.update({
          where: { id: reg.id },
          data: { notes: `${reg.notes || ""}\nREMINDER_24H_SENT_${now.toISOString()}`.slice(0, 1000) },
        });
        sent++;
      } catch (err) {
        console.error("[cron event-reminders] fallo enviando a", reg.email, err);
      }
    }
  }

  return NextResponse.json({
    sent,
    events: events.length,
    ts: now.toISOString(),
  });
}
