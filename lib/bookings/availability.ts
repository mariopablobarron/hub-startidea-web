import { prisma } from "@/lib/db/prisma";

/**
 * Validación de disponibilidad de salas.
 *
 * Una reserva ocupa una sala desde startsAt hasta endsAt (excl). Dos
 * reservas para la misma sala se solapan si:
 *   nuevaStart < existenteEnd  &&  nuevaEnd > existenteStart
 *
 * Esta condición se traduce en Prisma con AND { startsAt: lt nuevaEnd },
 * { endsAt: gt nuevaStart }.
 */

export async function isSlotAvailable(opts: {
  roomSlug: string;
  startsAt: Date;
  endsAt: Date;
  excludeBookingId?: string;
}): Promise<boolean> {
  if (opts.endsAt <= opts.startsAt) return false;

  const overlap = await prisma.booking.findFirst({
    where: {
      roomSlug: opts.roomSlug,
      // Solo bookings activos bloquean el slot
      status: { in: ["PENDING", "CONFIRMED"] },
      // Solapamiento: existente.startsAt < nuevoFin && existente.endsAt > nuevoInicio
      startsAt: { lt: opts.endsAt },
      endsAt: { gt: opts.startsAt },
      ...(opts.excludeBookingId ? { NOT: { id: opts.excludeBookingId } } : {}),
    },
    select: { id: true },
  });

  return !overlap;
}

/**
 * Devuelve las reservas de una sala en un rango (para pintar el calendario).
 * Solo PENDING + CONFIRMED — las canceladas no bloquean.
 */
export async function bookingsInRange(opts: {
  roomSlug: string;
  from: Date;
  to: Date;
}) {
  return prisma.booking.findMany({
    where: {
      roomSlug: opts.roomSlug,
      status: { in: ["PENDING", "CONFIRMED"] },
      startsAt: { lt: opts.to },
      endsAt: { gt: opts.from },
    },
    orderBy: { startsAt: "asc" },
    include: {
      user: { select: { name: true, email: true } },
    },
  });
}

/**
 * Horario del HUB. De momento hardcoded — luego puede ir a content.json
 * o admin /horarios.
 */
export const OPENING_HOUR = 8; // 08:00
export const CLOSING_HOUR = 21; // 21:00
export const SLOT_MINUTES = 60; // bloques de 1h

/** ¿Está el rango dentro del horario laboral? */
export function isWithinOpeningHours(startsAt: Date, endsAt: Date): boolean {
  const startHour = startsAt.getHours() + startsAt.getMinutes() / 60;
  const endHour = endsAt.getHours() + endsAt.getMinutes() / 60;
  // Para reservas de un solo día. Si endsAt termina al cierre exacto, es OK.
  return (
    startHour >= OPENING_HOUR &&
    endHour <= CLOSING_HOUR &&
    startsAt.toDateString() === endsAt.toDateString()
  );
}
