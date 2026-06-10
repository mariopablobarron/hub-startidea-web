import "server-only";
import { prisma } from "@/lib/db/prisma";
import { bookableRooms } from "@/lib/content";

/**
 * Métricas para /transparencia — datos reales del HUB que pocas
 * empresas enseñan. Filosofía: si una sala está al 8%, lo decimos.
 *
 * Caching: revalidate=300 (5min) en la page, así no martirizamos BD.
 * Si la transparencia importa más que el rendimiento, bajar a 0.
 */

export type TransparencyMetrics = {
  generatedAt: Date;
  rangeDays: number;
  periodLabel: string;
  rooms: Array<{
    slug: string;
    name: string;
    hoursBooked: number;
    hoursAvailable: number;
    occupancyPct: number;
  }>;
  bookingsThisMonth: number;
  bookingsLastMonth: number;
  upcomingEvents: number;
  activeCoworkers: {
    fixed: number;
    flex: number;
    privateOffice: number;
  };
  feedbackTotal: number;
  feedbackResponded: number;
  feedbackResponseRate: number;
  feedbackPreviews: Array<{
    text: string;
    roomName: string;
    respondedAt: Date;
  }>;
};

// Horas teóricas reservables por día: 13h (08:00→21:00 inicio=08 → fin=21).
const HOURS_PER_DAY = 13;

export async function getTransparencyMetrics(): Promise<TransparencyMetrics> {
  const now = new Date();
  const rangeDays = 30;
  const periodStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  // Inicio del mes actual y del mes anterior (para delta)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = monthStart;

  const [bookingsInPeriod, bookingsThisMonth, bookingsLastMonth, upcomingEvents, coworkerCounts, feedbackTotal, feedbackResponded, feedbackPreviews] =
    await Promise.all([
      // 1. Reservas confirmadas/completadas en los últimos 30 días (por sala)
      prisma.booking.findMany({
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          startsAt: { gte: periodStart, lte: now },
        },
        select: { roomSlug: true, startsAt: true, endsAt: true },
      }),

      // 2. Reservas confirmadas mes actual
      prisma.booking.count({
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          startsAt: { gte: monthStart, lte: now },
        },
      }),

      // 3. Reservas confirmadas mes anterior (para delta)
      prisma.booking.count({
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] },
          startsAt: { gte: lastMonthStart, lt: lastMonthEnd },
        },
      }),

      // 4. Eventos próximos publicados
      prisma.event.count({
        where: {
          startsAt: { gte: now },
          published: true,
        },
      }).catch(() => 0),

      // 5. Coworkers activos por tipo (anonimizado: solo counts)
      prisma.user.groupBy({
        by: ["membershipType"],
        where: {
          membershipType: { not: null },
          OR: [{ membershipUntil: null }, { membershipUntil: { gte: now } }],
        },
        _count: { _all: true },
      }),

      // 6. Total Feedback enviados (sentAt no nulo, que siempre lo es)
      prisma.feedback.count(),

      // 7. Feedback respondidos
      prisma.feedback.count({ where: { respondedAt: { not: null } } }),

      // 8. Previews — los 3 últimos feedback respondidos con texto
      prisma.feedback.findMany({
        where: { respondedAt: { not: null }, text: { not: null } },
        include: { booking: { select: { roomSlug: true } } },
        orderBy: { respondedAt: "desc" },
        take: 3,
      }),
    ]);

  // Agregar horas reservadas por sala
  const hoursBySlug = new Map<string, number>();
  for (const b of bookingsInPeriod) {
    const hours = (b.endsAt.getTime() - b.startsAt.getTime()) / 3_600_000;
    hoursBySlug.set(b.roomSlug, (hoursBySlug.get(b.roomSlug) || 0) + hours);
  }
  const hoursAvailable = HOURS_PER_DAY * rangeDays;
  const rooms = bookableRooms.map((r) => {
    const booked = hoursBySlug.get(r.slug) || 0;
    return {
      slug: r.slug,
      name: r.name,
      hoursBooked: booked,
      hoursAvailable,
      occupancyPct: hoursAvailable > 0 ? (booked / hoursAvailable) * 100 : 0,
    };
  });

  // Coworkers anonimizados
  const byType: Record<string, number> = {};
  for (const c of coworkerCounts) {
    if (c.membershipType) byType[c.membershipType] = c._count._all;
  }
  const activeCoworkers = {
    fixed: byType["COWORKER_FIXED"] || 0,
    flex: byType["COWORKER_FLEX"] || 0,
    privateOffice: byType["OFFICE_PRIVATE"] || 0,
  };

  const responseRate = feedbackTotal > 0 ? (feedbackResponded / feedbackTotal) * 100 : 0;

  // Mapear roomSlug → roomName para previews
  const roomNameBySlug = new Map(bookableRooms.map((r) => [r.slug, r.name]));
  const previews = feedbackPreviews.map((f) => ({
    text: (f.text || "").trim(),
    roomName: roomNameBySlug.get(f.booking.roomSlug) || f.booking.roomSlug,
    respondedAt: f.respondedAt!,
  }));

  // Etiqueta del periodo (humana)
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  const periodLabel = `${fmt(periodStart)} → ${fmt(now)}`;

  return {
    generatedAt: now,
    rangeDays,
    periodLabel,
    rooms,
    bookingsThisMonth,
    bookingsLastMonth,
    upcomingEvents,
    activeCoworkers,
    feedbackTotal,
    feedbackResponded,
    feedbackResponseRate: responseRate,
    feedbackPreviews: previews,
  };
}
