import Link from "next/link";
import { Calendar, AlertCircle, CheckCircle2, XCircle, UserX } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { content } from "@/lib/content";
import { PageHeader, FlashBanner } from "../_components/Field";
import { changeBookingStatus } from "@/lib/bookings/actions";
import { formatEuros } from "@/lib/bookings/pricing";
import type { BookingStatus } from "@prisma/client";

type Props = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    status?: BookingStatus | "all" | "upcoming";
  }>;
};

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

  const counts = await prisma.booking.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countByStatus: Record<string, number> = {};
  for (const c of counts) countByStatus[c.status] = c._count._all;

  let where: Record<string, unknown> = {};
  if (filter === "upcoming") {
    where = { startsAt: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } };
  } else if (filter !== "all") {
    where = { status: filter };
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ status: "asc" }, { startsAt: "asc" }],
    take: 100,
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservas"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Aprobar reservas pendientes, ver la agenda y gestionar incidencias."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5">
        <StatusChip href="/admin/reservas?status=upcoming" active={filter === "upcoming"} label="Próximas" count={(countByStatus.PENDING || 0) + (countByStatus.CONFIRMED || 0)} icon={<Calendar size={12} />} />
        <StatusChip href="/admin/reservas?status=PENDING" active={filter === "PENDING"} label="Pendientes" count={countByStatus.PENDING || 0} icon={<AlertCircle size={12} />} />
        <StatusChip href="/admin/reservas?status=CONFIRMED" active={filter === "CONFIRMED"} label="Confirmadas" count={countByStatus.CONFIRMED || 0} icon={<CheckCircle2 size={12} />} />
        <StatusChip href="/admin/reservas?status=CANCELLED" active={filter === "CANCELLED"} label="Canceladas" count={countByStatus.CANCELLED || 0} icon={<XCircle size={12} />} />
        <StatusChip href="/admin/reservas?status=NO_SHOW" active={filter === "NO_SHOW"} label="No-show" count={countByStatus.NO_SHOW || 0} icon={<UserX size={12} />} />
        <StatusChip href="/admin/reservas?status=all" active={filter === "all"} label="Todas" />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-line)] bg-[var(--color-paper-2)]">
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Sala</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Propósito</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">€</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--color-mute)]">Sin reservas con este filtro.</td></tr>
            )}
            {bookings.map((b) => {
              const room = content.rooms.find((r) => r.slug === b.roomSlug);
              const startStr = b.startsAt.toLocaleString("es-ES", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              const durationH = (b.endsAt.getTime() - b.startsAt.getTime()) / 3_600_000;
              return (
                <tr key={b.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper-2)]/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{startStr}</div>
                    <div className="text-xs text-[var(--color-mute)]">{durationH.toFixed(1)}h</div>
                  </td>
                  <td className="px-4 py-3">{room?.name || b.roomSlug}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.user.name || "—"}</div>
                    <div className="text-xs text-[var(--color-mute)]">{b.user.email}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-sm text-[var(--color-mute)]">{b.purpose || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatEuros(b.totalCents)}</td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "PENDING" && (
                      <div className="inline-flex gap-1">
                        <ActionButton bookingId={b.id} newStatus="CONFIRMED" label="Aprobar" variant="primary" />
                        <ActionButton bookingId={b.id} newStatus="CANCELLED" label="Rechazar" variant="ghost" />
                      </div>
                    )}
                    {b.status === "CONFIRMED" && (
                      <div className="inline-flex gap-1">
                        <ActionButton bookingId={b.id} newStatus="CANCELLED" label="Cancelar" variant="ghost" />
                        <ActionButton bookingId={b.id} newStatus="NO_SHOW" label="No-show" variant="ghost" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusChip({
  href,
  active,
  label,
  count,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}) {
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

function ActionButton({
  bookingId,
  newStatus,
  label,
  variant,
}: {
  bookingId: string;
  newStatus: BookingStatus;
  label: string;
  variant: "primary" | "ghost";
}) {
  return (
    <form action={changeBookingStatus} className="inline">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="newStatus" value={newStatus} />
      <button
        type="submit"
        className={
          variant === "primary"
            ? "rounded-full bg-[var(--color-ink)] px-3 py-1 text-xs font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
            : "rounded-full border border-[var(--color-line)] px-3 py-1 text-xs hover:border-[var(--color-ink)]"
        }
      >
        {label}
      </button>
    </form>
  );
}
