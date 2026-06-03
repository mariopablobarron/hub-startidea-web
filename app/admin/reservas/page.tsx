import Link from "next/link";
import { Calendar, AlertCircle, CheckCircle2, XCircle, UserX, ChevronDown, MapPin, Users as UsersIcon } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { content, bookableRooms, bookingRef } from "@/lib/content";
import { PageHeader, FlashBanner } from "../_components/Field";
import { changeBookingStatus, markBookingPaidManually } from "@/lib/bookings/actions";
import { formatEuros } from "@/lib/bookings/pricing";
import type { BookingStatus } from "@prisma/client";

type Props = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    status?: BookingStatus | "all" | "upcoming";
    sala?: string;
  }>;
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No-show",
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  COMPLETED: "bg-blue-50 text-blue-700",
  NO_SHOW: "bg-red-50 text-red-700",
};

export default async function AdminReservasPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = sp.status || "upcoming";
  const salaFilter = sp.sala;

  // Bookings de hoy para el widget de cabecera "Ocupación hoy"
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  // Counts globales
  const [statusCounts, salaCounts, todayBookings] = await Promise.all([
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.groupBy({
      by: ["roomSlug"],
      where: { startsAt: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } },
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: {
        startsAt: { gte: todayStart, lte: todayEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  const countByStatus: Record<string, number> = {};
  for (const c of statusCounts) countByStatus[c.status] = c._count._all;
  const countByRoom: Record<string, number> = {};
  for (const c of salaCounts) countByRoom[c.roomSlug] = c._count._all;

  // Where dinámico
  const where: Record<string, unknown> = {};
  if (filter === "upcoming") {
    Object.assign(where, {
      startsAt: { gte: new Date() },
      status: { in: ["PENDING", "CONFIRMED"] },
    });
  } else if (filter !== "all") {
    where.status = filter;
  }
  if (salaFilter) where.roomSlug = salaFilter;

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ status: "asc" }, { startsAt: "asc" }],
    take: 100,
    include: {
      user: { select: { name: true, email: true, role: true, phone: true } },
      payment: { select: { status: true, method: true, stripeSessionId: true } },
      bond: { select: { type: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Aprobar pendientes, ver agenda completa por sala, leer observaciones."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {/* Widget HOY — vistazo rápido a las reservas del día actual.
          Para vista visual completa por sala, link a /admin/agenda. */}
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">Hoy</span>
            <span className="text-sm font-medium">
              {todayBookings.length === 0
                ? "Sin reservas"
                : `${todayBookings.length} reserva${todayBookings.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <Link
            href="/admin/agenda"
            className="text-xs text-[var(--color-coral-600)] underline underline-offset-2 hover:text-[var(--color-coral-700)]"
          >
            Ver agenda visual →
          </Link>
        </div>
        {todayBookings.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {todayBookings.map((b) => {
              const room = content.rooms.find((r) => r.slug === b.roomSlug);
              const time = b.startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
              const endTime = b.endsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
              const isConfirmed = b.status === "CONFIRMED";
              return (
                <li
                  key={b.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                    isConfirmed
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-amber-300 bg-amber-50 text-amber-900"
                  }`}
                >
                  <span className="font-mono">
                    {time}–{endTime}
                  </span>
                  <span>·</span>
                  <span className="font-medium">{room?.name || b.roomSlug}</span>
                  <span className="opacity-70">{b.user.name || b.user.email.split("@")[0]}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-1.5">
        <StatusChip href={hrefWith(sp, { status: "upcoming" })} active={filter === "upcoming"} label="Próximas" count={(countByStatus.PENDING || 0) + (countByStatus.CONFIRMED || 0)} icon={<Calendar size={12} />} />
        <StatusChip href={hrefWith(sp, { status: "PENDING" })} active={filter === "PENDING"} label="Pendientes" count={countByStatus.PENDING || 0} icon={<AlertCircle size={12} />} />
        <StatusChip href={hrefWith(sp, { status: "CONFIRMED" })} active={filter === "CONFIRMED"} label="Confirmadas" count={countByStatus.CONFIRMED || 0} icon={<CheckCircle2 size={12} />} />
        <StatusChip href={hrefWith(sp, { status: "CANCELLED" })} active={filter === "CANCELLED"} label="Canceladas" count={countByStatus.CANCELLED || 0} icon={<XCircle size={12} />} />
        <StatusChip href={hrefWith(sp, { status: "NO_SHOW" })} active={filter === "NO_SHOW"} label="No-show" count={countByStatus.NO_SHOW || 0} icon={<UserX size={12} />} />
        <StatusChip href={hrefWith(sp, { status: "all" })} active={filter === "all"} label="Todas" />
      </div>

      {/* Filtros por sala (tabs de las salas reservables + "Todas") */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-2">
        <span className="px-2 text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">Sala:</span>
        <RoomChip href={hrefWith(sp, { sala: undefined })} active={!salaFilter} label="Todas" />
        {bookableRooms.map((r) => (
          <RoomChip
            key={r.slug}
            href={hrefWith(sp, { sala: r.slug })}
            active={salaFilter === r.slug}
            label={r.name}
            count={countByRoom[r.slug] || 0}
          />
        ))}
      </div>

      {/* Tabla con detalles expandibles */}
      <div className="space-y-2">
        {bookings.length === 0 && (
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-12 text-center text-[var(--color-mute)]">
            Sin reservas con este filtro.
          </div>
        )}
        {bookings.map((b) => {
          const room = content.rooms.find((r) => r.slug === b.roomSlug);
          const startStr = b.startsAt.toLocaleString("es-ES", {
            weekday: "long",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          const durationH = (b.endsAt.getTime() - b.startsAt.getTime()) / 3_600_000;
          const hasObservations = b.notes || b.adminNotes || b.attendees;

          return (
            <details key={b.id} className="group rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-ink)] open:shadow-sm">
              <summary className="cursor-pointer list-none px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                      <span className="font-medium text-[var(--color-ink)]">{room?.name || b.roomSlug}</span>
                      <span className="text-sm text-[var(--color-mute)]">·</span>
                      <span className="text-sm capitalize">{startStr}</span>
                      <span className="text-xs text-[var(--color-mute)]">({durationH.toFixed(1)}h)</span>
                    </div>
                    <div className="mt-1 truncate text-sm text-[var(--color-mute)]">
                      <strong>{b.user.name || b.user.email}</strong>
                      {b.user.role !== "VISITOR" && <span> · {b.user.role.toLowerCase()}</span>}
                      {b.purpose && <span> — &ldquo;{b.purpose}&rdquo;</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {b.totalCents > 0 && <span className="font-medium">{formatEuros(b.totalCents)}</span>}
                    {b.payment?.status === "PAID" && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Pagado</span>
                    )}
                    {b.payment?.status === "PENDING" && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Pago pendiente</span>
                    )}
                    {b.payment?.method === "BANK_TRANSFER" && (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">Transferencia</span>
                    )}
                    {b.bondId && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Con bono</span>
                    )}
                    <ChevronDown size={16} className="text-[var(--color-mute)] transition group-open:rotate-180" />
                  </div>
                </div>
              </summary>

              {/* Detalle expandido */}
              <div className="border-t border-[var(--color-line)] px-5 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <Info label="Sala" value={room?.name || b.roomSlug} icon={<MapPin size={12} />} />
                    <Info label="Fecha y hora" value={`${b.startsAt.toLocaleString("es-ES")} → ${b.endsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`} icon={<Calendar size={12} />} />
                    {b.attendees && <Info label="Asistentes esperados" value={`${b.attendees} personas`} icon={<UsersIcon size={12} />} />}
                    <Info label="Cliente" value={`${b.user.name || "—"} · ${b.user.email}${b.user.phone ? " · " + b.user.phone : ""}`} />
                    <Info label="Rol del cliente" value={b.user.role} />
                    <Info label="Referencia / concepto" value={bookingRef(b.id)} />
                    {b.payment?.method === "BANK_TRANSFER" && (
                      <Info
                        label="Método de pago"
                        value={`Transferencia · ${b.payment.status === "PAID" ? "cobrada" : "pendiente de ingreso"}`}
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    {b.purpose && (
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">Propósito</div>
                        <div className="mt-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper-2)] p-3 text-sm">{b.purpose}</div>
                      </div>
                    )}
                    {b.notes && (
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">Notas del cliente</div>
                        <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm whitespace-pre-wrap">{b.notes}</div>
                      </div>
                    )}
                    {b.adminNotes && (
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">Notas internas (admin)</div>
                        <div className="mt-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper-2)] p-3 text-sm whitespace-pre-wrap">{b.adminNotes}</div>
                      </div>
                    )}
                    {!hasObservations && (
                      <p className="text-sm text-[var(--color-mute)]">Sin observaciones.</p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
                  <a
                    href={`mailto:${b.user.email}?subject=${encodeURIComponent(`Reserva ${room?.name || b.roomSlug} — ${b.startsAt.toLocaleDateString("es-ES")}`)}`}
                    className="text-xs text-[var(--color-mute)] hover:text-[var(--color-coral-600)]"
                  >
                    Escribir a {b.user.email} →
                  </a>
                  <div className="flex flex-wrap gap-1.5">
                    {b.status === "PENDING" && (
                      <>
                        <AdminAction bookingId={b.id} newStatus="CONFIRMED" label="Aprobar" variant="primary" />
                        <AdminAction bookingId={b.id} newStatus="CANCELLED" label="Rechazar" variant="ghost" />
                      </>
                    )}
                    {b.status === "CONFIRMED" && (
                      <>
                        <AdminAction bookingId={b.id} newStatus="CANCELLED" label="Cancelar" variant="ghost" />
                        <AdminAction bookingId={b.id} newStatus="NO_SHOW" label="No-show" variant="danger" />
                      </>
                    )}
                    {((b.payment?.status === "PENDING" && b.payment?.method === "BANK_TRANSFER") ||
                      (b.status === "PENDING" && b.totalCents > 0 && !b.payment)) && (
                      <form action={markBookingPaidManually} className="inline">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <button
                          type="submit"
                          className="rounded-full bg-emerald-600 px-4 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          ✓ Pago recibido
                        </button>
                      </form>
                    )}
                    {b.payment?.stripeSessionId && (
                      <Link
                        href={`https://dashboard.stripe.com/test/payments/${b.payment.stripeSessionId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs hover:border-[var(--color-ink)]"
                      >
                        Ver en Stripe ↗
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {/* Resumen al final si filtrado por sala */}
      {salaFilter && bookings.length > 0 && (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-4 text-sm text-[var(--color-mute)]">
          {bookings.length} reserva{bookings.length === 1 ? "" : "s"} en{" "}
          <strong className="text-[var(--color-ink)]">{content.rooms.find((r) => r.slug === salaFilter)?.name || salaFilter}</strong>{" "}
          ({filter === "upcoming" ? "próximas" : filter}). Total facturado:{" "}
          <strong className="text-[var(--color-ink)]">
            {formatEuros(bookings.reduce((s, b) => s + (b.payment?.status === "PAID" ? b.totalCents : 0), 0))}
          </strong>
        </div>
      )}
    </div>
  );
}

function hrefWith(sp: { status?: string; sala?: string }, override: { status?: string; sala?: string | undefined }): string {
  const params = new URLSearchParams();
  const next = { ...sp, ...override };
  if (next.status) params.set("status", next.status);
  if (next.sala) params.set("sala", next.sala);
  const qs = params.toString();
  return `/admin/reservas${qs ? "?" + qs : ""}`;
}

function StatusChip({ href, active, label, count, icon }: { href: string; active: boolean; label: string; count?: number; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${
        active
          ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border border-[var(--color-line)] text-[var(--color-mute)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
      }`}
    >
      {icon}
      {label}
      {typeof count === "number" && (
        <span className={`rounded-full px-1.5 ${active ? "bg-white/15" : "bg-[var(--color-paper-2)]"}`}>{count}</span>
      )}
    </Link>
  );
}

function RoomChip({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition ${
        active
          ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "bg-white text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 && <span className="opacity-60">·&nbsp;{count}</span>}
    </Link>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">
        {icon && <span className="mr-1 inline-block align-middle">{icon}</span>}
        {label}
      </div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function AdminAction({
  bookingId,
  newStatus,
  label,
  variant,
}: {
  bookingId: string;
  newStatus: BookingStatus;
  label: string;
  variant: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]",
    ghost: "border border-[var(--color-line)] hover:border-[var(--color-ink)]",
    danger: "border border-red-200 text-red-700 hover:bg-red-50",
  }[variant];
  return (
    <form action={changeBookingStatus} className="inline">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="newStatus" value={newStatus} />
      <button type="submit" className={`rounded-full px-4 py-1 text-xs font-medium ${styles}`}>
        {label}
      </button>
    </form>
  );
}
