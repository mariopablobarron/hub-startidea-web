import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, X, CreditCard } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/roles";
import { cancelOwnBooking } from "@/lib/bookings/actions";
import { createCheckoutForBooking } from "@/lib/stripe/actions";
import { formatEuros } from "@/lib/bookings/pricing";
import { content } from "@/lib/content";
import type { BookingStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Mis reservas",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ saved?: string; error?: string; id?: string }> };

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No-show",
};

export default async function MisReservasPage({ searchParams }: Props) {
  const user = await requireAuth("/me/reservas");
  const sp = await searchParams;

  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.booking.findMany({
      where: { userId: user.id, startsAt: { lt: new Date() } },
      orderBy: { startsAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/me" className="inline-flex items-center gap-1 text-[var(--color-mute)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={14} /> Mi cuenta
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">Mis reservas</h1>
          <p className="mt-2 text-[var(--color-mute)]">
            {upcoming.length} próximas · {past.length} pasadas
          </p>
        </div>
        <Link
          href="/reservar"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
        >
          <Calendar size={14} /> Nueva reserva
        </Link>
      </header>

      {sp.saved === "1" && (
        <div role="status" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          ✓ Reserva enviada. Recibirás un email con el estado.
        </div>
      )}
      {sp.error && (
        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {sp.error}
        </div>
      )}

      {/* Próximas */}
      <section className="mt-10">
        <h2 className="font-display text-xl">Próximas</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-mute)]">
            No tienes reservas activas.{" "}
            <Link href="/reservar" className="font-medium underline underline-offset-2 hover:text-[var(--color-coral-600)]">
              Crear una
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} canCancel highlight={sp.id === b.id} />
            ))}
          </ul>
        )}
      </section>

      {/* Pasadas */}
      {past.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl text-[var(--color-mute)]">Pasadas</h2>
          <ul className="mt-4 space-y-2 opacity-75">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b} compact />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function BookingCard({
  booking,
  canCancel = false,
  compact = false,
  highlight = false,
}: {
  booking: {
    id: string;
    roomSlug: string;
    startsAt: Date;
    endsAt: Date;
    status: BookingStatus;
    totalCents: number;
    purpose: string | null;
  };
  canCancel?: boolean;
  compact?: boolean;
  highlight?: boolean;
}) {
  const room = content.rooms.find((r) => r.slug === booking.roomSlug);
  const fmt = booking.startsAt.toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dur = (booking.endsAt.getTime() - booking.startsAt.getTime()) / 3_600_000;

  const statusColor: Record<BookingStatus, string> = {
    PENDING: "bg-amber-50 text-amber-700",
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-gray-100 text-gray-600",
    COMPLETED: "bg-blue-50 text-blue-700",
    NO_SHOW: "bg-red-50 text-red-700",
  };

  return (
    <li
      className={`rounded-2xl border p-${compact ? "4" : "5"} ${
        highlight
          ? "border-[var(--color-coral-500)] bg-[var(--color-coral-50)]"
          : "border-[var(--color-line)] bg-[var(--color-paper)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">{room?.name || booking.roomSlug}</div>
          <div className="mt-1 text-sm text-[var(--color-mute)]">
            {fmt} · {dur.toFixed(1)}h
          </div>
          {booking.purpose && !compact && (
            <div className="mt-2 text-sm text-[var(--color-ink)]/85">{booking.purpose}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[booking.status]}`}>
            {STATUS_LABEL[booking.status]}
          </span>
          {booking.totalCents > 0 && (
            <span className="text-sm font-medium">{formatEuros(booking.totalCents)}</span>
          )}
        </div>
      </div>
      {canCancel && (booking.status === "PENDING" || booking.status === "CONFIRMED") && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* Pagar si está PENDING con importe > 0 */}
          {booking.status === "PENDING" && booking.totalCents > 0 && (
            <form action={createCheckoutForBooking}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 py-1.5 text-xs font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
              >
                <CreditCard size={12} /> Pagar ahora · {formatEuros(booking.totalCents)}
              </button>
            </form>
          )}
          <form action={cancelOwnBooking}>
            <input type="hidden" name="bookingId" value={booking.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-mute)] hover:text-red-700"
            >
              <X size={12} /> Cancelar reserva
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
