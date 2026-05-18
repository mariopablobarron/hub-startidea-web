import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { content, bookableRooms } from "@/lib/content";
import { requireAuth, ROLE_LABEL } from "@/lib/auth/roles";
import { createBooking } from "@/lib/bookings/actions";
import { quotePrice, formatEuros } from "@/lib/bookings/pricing";
import { bookingsInRange } from "@/lib/bookings/availability";

export const metadata: Metadata = {
  title: "Reservar sala",
  description: "Reserva una sala del HUB Startidea — coworking, formación, podcast.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    sala?: string;
    fecha?: string;
    error?: string;
  }>;
};

export default async function ReservarPage({ searchParams }: Props) {
  const user = await requireAuth("/reservar");
  const sp = await searchParams;

  // Solo salas reservables (las marcadas bookable !== false en content.json).
  // Aulas inactivas y coworking abierto NO entran aquí.
  const rooms = bookableRooms.length > 0 ? bookableRooms : content.rooms;
  const selectedSlug = sp.sala || rooms[0].slug;
  const room = rooms.find((r) => r.slug === selectedSlug) || rooms[0];

  // Fecha por defecto: hoy
  const defaultDate = sp.fecha || new Date().toISOString().slice(0, 10);

  // Reservas del día seleccionado para mostrar slots ocupados
  const from = new Date(`${defaultDate}T00:00:00`);
  const to = new Date(`${defaultDate}T23:59:59`);
  const dayBookings = await bookingsInRange({
    roomSlug: room.slug,
    from,
    to,
  });

  // Quotes para 1h, 2h y 4h para que el usuario vea la tarifa por hora
  // sin tener que rellenar el form. Todas incluyen IVA desglosado.
  const [quote1h, quote2h, quote4h] = await Promise.all([
    quotePrice({ roomSlug: room.slug, durationHours: 1, role: user.role }),
    quotePrice({ roomSlug: room.slug, durationHours: 2, role: user.role }),
    quotePrice({ roomSlug: room.slug, durationHours: 4, role: user.role }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-8 flex items-center gap-2 text-sm text-[var(--color-mute)]">
        <Link href="/me" className="hover:text-[var(--color-ink)]">Mi cuenta</Link>
        <span>/</span>
        <span>Reservar</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">Reservar una sala</h1>
          <p className="mt-2 text-[var(--color-mute)]">
            Hola {user.name || user.email.split("@")[0]} · {ROLE_LABEL[user.role]}.
            {user.role === "MEMBER" && " Tu rol confirma reservas automáticamente."}
            {user.role === "CLIENT" && " Las reservas quedan pendientes hasta que admin las apruebe."}
          </p>
        </div>
        <Link
          href="/me/reservas"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
        >
          <Calendar size={14} /> Mis reservas
        </Link>
      </header>

      {sp.error && (
        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {sp.error}
        </div>
      )}

      {/* Selector de sala — tabs (solo reservables) */}
      <div className="mt-10 flex flex-wrap gap-2">
        {rooms.map((r) => (
          <Link
            key={r.slug}
            href={`/reservar?sala=${r.slug}&fecha=${defaultDate}`}
            className={`rounded-full px-4 py-2 text-sm transition ${
              r.slug === room.slug
                ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                : "border border-[var(--color-line)] text-[var(--color-mute)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
            }`}
          >
            {r.name}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Form */}
        <form action={createBooking} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
          <input type="hidden" name="roomSlug" value={room.slug} />

          <h2 className="font-display text-xl">{room.name}</h2>
          <p className="mt-1 text-sm text-[var(--color-mute)]">{room.short}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Fecha</span>
              <input
                type="date"
                name="date"
                defaultValue={defaultDate}
                required
                min={new Date().toISOString().slice(0, 10)}
                className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Asistentes (opcional)</span>
              <input
                type="number"
                name="attendees"
                min="1"
                max="200"
                placeholder={`máx ${Math.max(room.capacity.school, room.capacity.theater, room.capacity.coctel ?? 0)}`}
                className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Hora inicio</span>
              <input
                type="time"
                name="startTime"
                defaultValue="10:00"
                required
                min="08:00"
                max="20:00"
                step="3600"
                className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
              />
              <span className="mt-1 block text-xs text-[var(--color-mute)]">Horas completas (08:00 - 20:00).</span>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Hora fin</span>
              <input
                type="time"
                name="endTime"
                defaultValue="12:00"
                required
                min="09:00"
                max="21:00"
                step="3600"
                className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
              />
              <span className="mt-1 block text-xs text-[var(--color-mute)]">Horas completas (09:00 - 21:00).</span>
            </label>
          </div>

          <label className="mt-4 block text-sm">
            <span className="font-medium">¿Qué vas a hacer?</span>
            <input
              type="text"
              name="purpose"
              required
              maxLength={500}
              placeholder="Ej. Formación de equipo, grabar podcast, reunión cliente…"
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            />
          </label>

          <label className="mt-4 block text-sm">
            <span className="font-medium">Notas (opcional)</span>
            <textarea
              name="notes"
              rows={3}
              maxLength={2000}
              placeholder="¿Necesitas algo concreto? proyector, café, configuración de mesas…"
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            />
          </label>

          <button
            type="submit"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
          >
            Enviar reserva <ArrowRight size={14} />
          </button>

          <p className="mt-3 text-xs text-[var(--color-mute)]">
            {user.role === "MEMBER" || user.role === "ADMIN"
              ? "Tu reserva queda confirmada al instante."
              : "Tu reserva quedará pendiente hasta que admin la apruebe."}
          </p>
        </form>

        {/* Side: tarifas + ocupación */}
        <aside className="space-y-6">
          {/* Tarifas */}
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
            <h3 className="font-display text-base">Tarifas — {ROLE_LABEL[user.role]}</h3>
            {!quote1h.quoted ? (
              <p className="mt-3 text-sm text-[var(--color-mute)]">
                Sala sin tarifa por hora configurada. Tu reserva quedará pendiente para
                presupuestar a medida.
              </p>
            ) : (
              <>
                <div className="mt-3 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[var(--color-mute)]">Base por hora</span>
                    <span className="font-medium">{formatEuros(quote1h.baseHourCents)}</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-[var(--color-mute)]">
                    <span>+ IVA {quote1h.vatRatePct}%</span>
                    <span>{formatEuros(quote1h.vatCents)}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-[var(--color-line)] pt-2">
                    <span className="font-medium">PVP por hora</span>
                    <span className="font-display text-lg tracking-tight">
                      {formatEuros(quote1h.totalCents)}
                    </span>
                  </div>
                  {quote1h.discountPct > 0 && (
                    <p className="mt-1 text-xs text-[var(--color-coral-600)]">
                      Incluye {quote1h.discountPct}% descuento {ROLE_LABEL[user.role].toLowerCase()}.
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-paper-2)] p-3 text-xs">
                  <div>
                    <div className="text-[var(--color-mute)]">2 horas</div>
                    <div className="font-medium">{formatEuros(quote2h.totalCents)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-mute)]">4 horas</div>
                    <div className="font-medium">{formatEuros(quote4h.totalCents)}</div>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-[var(--color-mute)]">
                  Todos los precios incluyen IVA. Stripe cobra el importe total final.
                </p>
              </>
            )}
          </div>

          {/* Ocupación del día */}
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
            <h3 className="font-display text-base">Ocupación del {defaultDate}</h3>
            {dayBookings.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-mute)]">Sala libre todo el día.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {dayBookings.map((b) => (
                  <li key={b.id} className="flex justify-between gap-2">
                    <span className="text-[var(--color-mute)]">
                      {b.startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {b.endsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={`text-xs ${b.status === "CONFIRMED" ? "text-emerald-700" : "text-amber-700"}`}>
                      {b.status === "CONFIRMED" ? "Ocupado" : "Pendiente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
