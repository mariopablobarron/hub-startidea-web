import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { content } from "@/lib/content";

/**
 * Cron endpoint — resumen KPI semanal del HUB por Telegram a Mario.
 *
 * Cada domingo 09:00 UTC manda un mensaje con lo que pasó la semana:
 * nuevas reservas, ingresos, ocupación top, feedbacks recibidos,
 * usuarios nuevos. Visibilidad continua sin abrir el admin.
 *
 * Cron del host:
 *   0 9 * * 0 curl -sf -H "Authorization: Bearer $CRON_SECRET" \
 *     https://hubstartidea.es/api/cron/weekly-kpis
 *
 * Idempotencia: no escribe BD, solo lee + envía Telegram. Si el cron
 * corre 2 veces el mismo domingo, manda 2 mensajes (no es problema —
 * preferimos eso a tracking de estado para algo informativo).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) {
    return NextResponse.json({ error: "telegram-no-configurado" }, { status: 503 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    newBookingsThisWeek,
    newBookingsLastWeek,
    confirmedThisWeek,
    paidPayments,
    newUsers,
    feedbacksThisWeek,
    upcomingBookings,
    pendingBookings,
    activeKeyHolders,
    keyHoldersGrantedThisWeek,
  ] = await Promise.all([
    // Reservas creadas esta semana (cualquier estado)
    prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
    // Semana anterior (para delta)
    prisma.booking.count({
      where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
    // Confirmadas esta semana
    prisma.booking.findMany({
      where: { status: "CONFIRMED", createdAt: { gte: weekAgo } },
      select: { roomSlug: true, totalCents: true, startsAt: true },
    }),
    // Pagos completados esta semana
    prisma.payment.aggregate({
      where: { status: "PAID", updatedAt: { gte: weekAgo } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    // Usuarios nuevos
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    // Feedbacks respondidos esta semana
    prisma.feedback.count({ where: { respondedAt: { gte: weekAgo } } }),
    // Próximas reservas confirmadas (siguiente 7 días)
    prisma.booking.count({
      where: {
        status: "CONFIRMED",
        startsAt: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    // Pendientes (esperando aprobación/pago) — accionable
    prisma.booking.count({ where: { status: "PENDING" } }),
    // Control de acceso: cuánta gente tiene llave/código activo al espacio
    prisma.keyHolder.count({ where: { status: "ACTIVE" } }),
    // Altas de acceso esta semana (para señalar cambios en el padrón)
    prisma.keyHolder.count({ where: { status: "ACTIVE", grantedAt: { gte: weekAgo } } }),
  ]);

  const incomeThisWeek = paidPayments._sum.amountCents ?? 0;
  const delta = newBookingsThisWeek - newBookingsLastWeek;
  const arrow = delta > 0 ? "📈" : delta < 0 ? "📉" : "➡️";

  // Sala más reservada esta semana
  const roomCounts = new Map<string, number>();
  for (const b of confirmedThisWeek) {
    roomCounts.set(b.roomSlug, (roomCounts.get(b.roomSlug) ?? 0) + 1);
  }
  const topRoom = [...roomCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topRoomName = topRoom
    ? content.rooms.find((r) => r.slug === topRoom[0])?.name ?? topRoom[0]
    : null;

  const fmtRange = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

  // Si la semana fue completamente plana (0 reservas, 0 users, 0 pagos),
  // mandamos un mensaje breve en vez del informe largo — menos ruido.
  const isQuietWeek =
    newBookingsThisWeek === 0 && newUsers === 0 && incomeThisWeek === 0 && feedbacksThisWeek === 0;

  let text: string;
  if (isQuietWeek) {
    text = [
      `📊 *KPIs HUB · ${fmtRange(weekAgo)}–${fmtRange(now)}*`,
      ``,
      `Semana tranquila: 0 reservas nuevas, 0 usuarios, 0 ingresos.`,
      pendingBookings > 0 ? `\n⚠️ Pero hay *${pendingBookings} reservas PENDIENTES* esperando acción → /admin/reservas` : ``,
      ``,
      `_Cuando empiece a moverse, este resumen crecerá solo._`,
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    text = [
      `📊 *KPIs HUB · ${fmtRange(weekAgo)}–${fmtRange(now)}*`,
      ``,
      `${arrow} *Reservas nuevas:* ${newBookingsThisWeek} (semana anterior: ${newBookingsLastWeek})`,
      `✅ *Confirmadas:* ${confirmedThisWeek.length}`,
      `💶 *Ingresos:* ${(incomeThisWeek / 100).toFixed(2)}€ (${paidPayments._count._all} pagos)`,
      `👤 *Usuarios nuevos:* ${newUsers}`,
      `💬 *Feedbacks recibidos:* ${feedbacksThisWeek}`,
      topRoomName ? `🏆 *Sala estrella:* ${topRoomName} (${topRoom![1]} reservas)` : ``,
      ``,
      `📅 *Próximos 7 días:* ${upcomingBookings} reservas confirmadas`,
      pendingBookings > 0 ? `⚠️ *${pendingBookings} pendientes* esperando acción → /admin/reservas` : ``,
      `🔑 *Acceso al espacio:* ${activeKeyHolders} con llave/código${keyHoldersGrantedThisWeek > 0 ? ` (+${keyHoldersGrantedThisWeek} esta semana)` : ""}`,
      ``,
      `_Detalle completo: hubstartidea.es/admin_`,
    ]
      .filter(Boolean)
      .join("\n");
  }

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
  }).catch((e) => console.error("[weekly-kpis] telegram failed:", e));

  return NextResponse.json({
    ok: true,
    quietWeek: isQuietWeek,
    metrics: {
      newBookingsThisWeek,
      confirmed: confirmedThisWeek.length,
      incomeEur: incomeThisWeek / 100,
      newUsers,
      feedbacksThisWeek,
      upcomingBookings,
      pendingBookings,
      activeKeyHolders,
      keyHoldersGrantedThisWeek,
    },
  });
}
