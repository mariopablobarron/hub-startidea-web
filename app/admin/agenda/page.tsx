import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, ROLE_LABEL } from "@/lib/auth/roles";
import { content, bookableRooms } from "@/lib/content";
import { PageHeader } from "../_components/Field";
import { formatEuros } from "@/lib/bookings/pricing";

type Props = {
  searchParams: Promise<{ fecha?: string }>;
};

export const dynamic = "force-dynamic";

const HOUR_START = 8;
const HOUR_END = 21; // último slot 20:00-21:00
const SLOTS = HOUR_END - HOUR_START; // 13

const FMT_HOUR = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default async function AdminAgendaPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  // Fecha seleccionada (default: hoy)
  const todayISO = new Date().toISOString().slice(0, 10);
  const dateISO = sp.fecha || todayISO;
  const dayStart = new Date(`${dateISO}T00:00:00`);
  const dayEnd = new Date(`${dateISO}T23:59:59`);

  // Navegación día anterior / siguiente
  const d = new Date(dateISO);
  const prevDay = new Date(d.getTime() - 86_400_000).toISOString().slice(0, 10);
  const nextDay = new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10);

  // Bookings del día — solo PENDING + CONFIRMED (los CANCELLED no ocupan)
  const bookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  // Map sala → hora → booking (para pintar celdas)
  type Cell = (typeof bookings)[number] & {
    /** Si el booking abarca varias horas, "primera" o "cont" */
    cellType: "first" | "cont";
    durationH: number;
  };
  const grid: Record<string, Record<number, Cell>> = {};
  for (const r of bookableRooms) grid[r.slug] = {};

  for (const b of bookings) {
    const startH = b.startsAt.getHours();
    const endH = b.endsAt.getHours();
    const durationH = endH - startH;
    if (!grid[b.roomSlug]) continue; // sala no reservable (ignoramos)
    for (let h = startH; h < endH; h++) {
      if (h < HOUR_START || h >= HOUR_END) continue;
      grid[b.roomSlug][h] = {
        ...b,
        cellType: h === startH ? "first" : "cont",
        durationH,
      };
    }
  }

  // Totales del día
  const totalBookings = bookings.length;
  const totalConfirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const totalPending = bookings.filter((b) => b.status === "PENDING").length;
  const totalRevenueCents = bookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((s, b) => s + b.totalCents, 0);

  // Formatos
  const fmtDate = new Date(dateISO).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const isToday = dateISO === todayISO;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda de salas"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Vista visual de ocupación. Click en una celda ocupada para ver detalles. Cambia de día con las flechas o el selector."
      />

      {/* Navegación de fecha */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/agenda?fecha=${prevDay}`}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] hover:border-[var(--color-ink)]"
            aria-label="Día anterior"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href={`/admin/agenda?fecha=${nextDay}`}
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] hover:border-[var(--color-ink)]"
            aria-label="Día siguiente"
          >
            <ChevronRight size={16} />
          </Link>
          <div className="ml-2 flex items-center gap-2">
            <Calendar size={14} className="text-[var(--color-mute)]" />
            <span className="font-display text-lg capitalize tracking-tight">{fmtDate}</span>
            {isToday && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Hoy
              </span>
            )}
          </div>
        </div>
        {!isToday && (
          <Link
            href={`/admin/agenda?fecha=${todayISO}`}
            className="rounded-full border border-[var(--color-line)] px-4 py-1.5 text-xs hover:border-[var(--color-ink)]"
          >
            Volver a hoy
          </Link>
        )}
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Reservas" value={String(totalBookings)} />
        <Stat
          label="Confirmadas"
          value={String(totalConfirmed)}
          color={totalConfirmed > 0 ? "emerald" : "default"}
        />
        <Stat
          label="Pendientes"
          value={String(totalPending)}
          color={totalPending > 0 ? "amber" : "default"}
        />
        <Stat label="Facturado" value={formatEuros(totalRevenueCents)} />
      </div>

      {/* Grid de agenda */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-[var(--color-paper-2)]">
              <th className="sticky left-0 z-10 w-28 bg-[var(--color-paper-2)] px-3 py-2 text-left text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">
                <Clock size={12} className="mr-1 inline-block align-text-bottom" />
                Hora
              </th>
              {bookableRooms.map((r) => (
                <th
                  key={r.slug}
                  className="border-l border-[var(--color-line)] px-3 py-2 text-left text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]"
                >
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOTS }).map((_, i) => {
              const h = HOUR_START + i;
              return (
                <tr key={h} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="sticky left-0 z-10 bg-[var(--color-paper)] px-3 py-2 text-sm font-medium">
                    {FMT_HOUR(h)}
                  </td>
                  {bookableRooms.map((r) => {
                    const cell = grid[r.slug]?.[h];
                    // Slot pasado en el día de hoy: deshabilitamos para no
                    // permitir reservar en el pasado.
                    const isPastSlot =
                      isToday && h <= new Date().getHours();
                    return (
                      <td
                        key={r.slug}
                        className={`border-l border-[var(--color-line)] p-1 align-top ${
                          cell ? "" : isPastSlot ? "" : "bg-emerald-50/40"
                        }`}
                      >
                        {!cell ? (
                          isPastSlot ? (
                            <div className="grid h-12 place-items-center text-[10px] uppercase tracking-[0.12em] text-[var(--color-mute)]/30">
                              pasado
                            </div>
                          ) : (
                            // Slot libre → link a /reservar pre-rellenando
                            // sala + fecha + hora. Admin click = reserva
                            // rápida sin tener que volver a teclear nada.
                            <Link
                              href={`/reservar?sala=${r.slug}&fecha=${dateISO}&hora=${h}`}
                              className="group grid h-12 place-items-center rounded-md border border-transparent text-[10px] uppercase tracking-[0.12em] text-emerald-700/40 transition hover:border-emerald-400 hover:bg-emerald-100 hover:text-emerald-900"
                              title={`Reservar ${r.name} a las ${FMT_HOUR(h)}`}
                            >
                              <span className="group-hover:hidden">libre</span>
                              <span className="hidden group-hover:inline">+ Reservar</span>
                            </Link>
                          )
                        ) : cell.cellType === "first" ? (
                          <BookingCard cell={cell} />
                        ) : (
                          // Continuación visual del booking — barra sin contenido
                          <div
                            className={`h-12 rounded-md border ${
                              cell.status === "CONFIRMED"
                                ? "border-emerald-300 bg-emerald-100"
                                : "border-amber-300 bg-amber-100"
                            }`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-mute)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-50 ring-1 ring-emerald-200" />
          Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-300" />
          Confirmada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-300" />
          Pendiente de aprobar
        </span>
        <Link
          href="/admin/reservas"
          className="ml-auto text-[var(--color-coral-600)] underline underline-offset-2 hover:text-[var(--color-coral-700)]"
        >
          Gestionar reservas →
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
  color?: "default" | "emerald" | "amber";
}) {
  const colors = {
    default: "border-[var(--color-line)] bg-[var(--color-paper)]",
    emerald: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
  }[color];
  return (
    <div className={`rounded-xl border p-3 ${colors}`}>
      <div className="text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">{label}</div>
      <div className="mt-1 font-display text-2xl tracking-tight">{value}</div>
    </div>
  );
}

function BookingCard({
  cell,
}: {
  cell: {
    id: string;
    user: { name: string | null; email: string; role: string };
    purpose: string | null;
    durationH: number;
    status: string;
    totalCents: number;
  };
}) {
  const isConfirmed = cell.status === "CONFIRMED";
  const tone = isConfirmed
    ? "border-emerald-300 bg-emerald-100 text-emerald-900"
    : "border-amber-300 bg-amber-100 text-amber-900";
  const userLabel = cell.user.name || cell.user.email.split("@")[0];
  return (
    <Link
      href={`/admin/reservas#booking-${cell.id}`}
      className={`block h-12 rounded-md border px-2 py-1 text-xs leading-tight transition hover:shadow-sm ${tone}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-medium">{userLabel}</span>
        <span className="shrink-0 text-[10px] opacity-80">{cell.durationH}h</span>
      </div>
      <div className="mt-0.5 truncate text-[10px] opacity-75">
        {cell.purpose || (isConfirmed ? "Confirmada" : "Pendiente")}
      </div>
    </Link>
  );
}
