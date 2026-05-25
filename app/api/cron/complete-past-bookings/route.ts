import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Cron endpoint — marca bookings pasadas (endsAt < ahora) como COMPLETED.
 *
 * Estado fuente: PENDING o CONFIRMED.
 *   - CONFIRMED → COMPLETED (caso normal, reserva sucedió bien)
 *   - PENDING → CANCELLED  (caso edge: admin nunca aprobó y la fecha
 *     ya pasó. Cancelamos automáticamente para limpiar la lista.)
 *
 * Estados que NO se tocan: CANCELLED, COMPLETED, NO_SHOW (finales).
 *
 * Cron en VPS recomendado:
 *   0 22 * * *  curl -sf -H "Authorization: Bearer $CRON_SECRET" \
 *               https://hubstartidea.es/api/cron/complete-past-bookings
 *
 * 22:00 UTC = 23:00 hora ES invierno / 00:00 hora ES verano. Después de
 * que cierre el HUB (horario 09:00-20:00) → cualquier reserva pendiente
 * del día ya terminó.
 *
 * Idempotente: si lo corres dos veces el mismo día solo afecta a los
 * que CAMBIARON de estado en la primera ejecución.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // CONFIRMED → COMPLETED
  const completed = await prisma.booking.updateMany({
    where: {
      status: "CONFIRMED",
      endsAt: { lt: now },
    },
    data: { status: "COMPLETED" },
  });

  // PENDING (sin aprobar) → CANCELLED
  // Si nunca se aprobó y la fecha pasó, ya no tiene sentido. Cancelamos
  // para limpiar la lista de "pendientes" del admin.
  const expiredPending = await prisma.booking.updateMany({
    where: {
      status: "PENDING",
      endsAt: { lt: now },
    },
    data: {
      status: "CANCELLED",
      adminNotes: "Cancelada automáticamente: nunca aprobada y fecha pasó.",
    },
  });

  return NextResponse.json({
    ok: true,
    completedCount: completed.count,
    expiredPendingCount: expiredPending.count,
    runAt: now.toISOString(),
  });
}
