import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ArrowRight, LogIn } from "lucide-react";
import { bookableRooms } from "@/lib/content";
import { getCurrentUser, ROLE_LABEL } from "@/lib/auth/roles";
import { createBooking } from "@/lib/bookings/actions";
import { createGuestBookingAndCheckout } from "@/lib/bookings/guest";
import { quotePrice, formatEuros } from "@/lib/bookings/pricing";
import { bookingsInRange } from "@/lib/bookings/availability";
import { prisma } from "@/lib/db/prisma";
import { SlotPicker } from "@/components/SlotPicker";
import { DateNavigator } from "@/components/DateNavigator";

export const metadata: Metadata = {
  title: "Reservar sala",
  description: "Reserva una sala del HUB Startidea — coworking, formación, podcast.",
};

type Props = {
  searchParams: Promise<{
    sala?: string;
    fecha?: string;
    /** Hora pre-seleccionada en formato HH (08-20). Permite que el
        admin pinche en una celda libre de /admin/agenda y aterrice
        en /reservar con el slot ya marcado. */
    hora?: string;
    error?: string;
  }>;
};

export default async function ReservarPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const isGuest = !user;

  // Salas reservables (bookable !== false en content.json).
  const rooms = bookableRooms;
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

  // Quotes con role efectivo: VISITOR (sin descuento) para guests, role real para users.
  const effectiveRole = user?.role ?? "VISITOR";

  // Descuento personal del usuario — para que vea su precio rebajado ya en el preview.
  const personal = user
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { discountKind: true, discountValue: true },
      })
    : null;
  const personalDiscount =
    personal?.discountKind && personal.discountValue != null
      ? { kind: personal.discountKind, value: personal.discountValue }
      : null;

  const [quote1h, quote2h, quote4h] = await Promise.all([
    quotePrice({ roomSlug: room.slug, durationHours: 1, role: effectiveRole, personalDiscount }),
    quotePrice({ roomSlug: room.slug, durationHours: 2, role: effectiveRole, personalDiscount }),
    quotePrice({ roomSlug: room.slug, durationHours: 4, role: effectiveRole, personalDiscount }),
  ]);

  // ¿Hay que cobrar? VISITOR/CLIENT/COLLABORATOR pagan; MEMBER/ADMIN no.
  const payable = quote1h.quoted && effectiveRole !== "MEMBER" && effectiveRole !== "ADMIN";

  const formAction = isGuest ? createGuestBookingAndCheckout : createBooking;

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
          {user ? (
            <p className="mt-2 text-[var(--color-mute)]">
              Hola {user.name || user.email.split("@")[0]} · {ROLE_LABEL[user.role]}.
              {user.role === "MEMBER" && " Tu rol confirma reservas automáticamente."}
              {user.role === "CLIENT" && " Las reservas quedan pendientes hasta que admin las apruebe."}
            </p>
          ) : (
            <p className="mt-2 text-[var(--color-mute)]">
              Rellena el formulario y elige cómo pagar — tarjeta o transferencia.
              {" "}
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`/reservar?sala=${room.slug}`)}`}
                className="underline underline-offset-2 hover:text-[var(--color-coral-600)]"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
              .
            </p>
          )}
        </div>
        {user ? (
          <Link
            href="/me/reservas"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
          >
            <Calendar size={14} /> Mis reservas
          </Link>
        ) : (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/reservar?sala=${room.slug}`)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
          >
            <LogIn size={14} /> Acceder
          </Link>
        )}
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
        <form action={formAction} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
          <input type="hidden" name="roomSlug" value={room.slug} />

          <h2 className="font-display text-xl">{room.name}</h2>
          <p className="mt-1 text-sm text-[var(--color-mute)]">{room.short}</p>

          {/* Fecha (hidden en el form, controlada por DateNavigator fuera
              del form para no anidar). Submit del form usa este value. */}
          <input type="hidden" name="date" value={defaultDate} />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <DateNavigator value={defaultDate} />
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
          </div>

          {/* Grid visual de slots horarios — sustituye los inputs de hora.
              Recibe bookings serializados para que el cliente pinte
              ocupados sin re-fetchearlos. */}
          {/* Si vienen con ?hora=HH (admin desde /admin/agenda), parseamos
              el slot pre-seleccionado para el SlotPicker. */}
          <div className="mt-6">
            <SlotPicker
              date={defaultDate}
              bookings={dayBookings.map((b) => ({
                startsAt: b.startsAt.toISOString(),
                endsAt: b.endsAt.toISOString(),
                status: b.status as "PENDING" | "CONFIRMED",
              }))}
              defaultDuration={2}
              defaultStart={
                sp.hora && /^\d{1,2}$/.test(sp.hora) ? parseInt(sp.hora, 10) : undefined
              }
            />
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

          {isGuest && (
            <div className="mt-6 space-y-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base">Tus datos</h3>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-mute)]">
                  Sin cuenta · sin contraseña
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">Nombre completo</span>
                  <input
                    type="text"
                    name="guestName"
                    required
                    autoComplete="name"
                    maxLength={120}
                    placeholder="María García"
                    className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Email</span>
                  <input
                    type="email"
                    name="guestEmail"
                    required
                    autoComplete="email"
                    placeholder="maria@empresa.com"
                    className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="font-medium">Teléfono (opcional)</span>
                <input
                  type="tel"
                  name="guestPhone"
                  autoComplete="tel"
                  placeholder="+34 600 123 456"
                  className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
                />
              </label>
              <p className="text-xs text-[var(--color-mute)]">
                Solo lo usamos para confirmarte la reserva y enviarte el enlace de gestión. Sin spam.
              </p>
            </div>
          )}

          {payable && (
            <div className="mt-6 space-y-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-4">
              <div>
                <span className="text-sm font-medium">¿Cómo quieres pagar?</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--color-line)] bg-white p-3 text-sm has-[:checked]:border-[var(--color-ink)] has-[:checked]:ring-1 has-[:checked]:ring-[var(--color-ink)]">
                    <input type="radio" name="paymentMethod" value="stripe" defaultChecked className="mt-0.5" />
                    <span>
                      <span className="block font-medium">Tarjeta</span>
                      <span className="block text-xs text-[var(--color-mute)]">Pago online (Stripe). Confirmación inmediata.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--color-line)] bg-white p-3 text-sm has-[:checked]:border-[var(--color-ink)] has-[:checked]:ring-1 has-[:checked]:ring-[var(--color-ink)]">
                    <input type="radio" name="paymentMethod" value="transfer" className="mt-0.5" />
                    <span>
                      <span className="block font-medium">Transferencia</span>
                      <span className="block text-xs text-[var(--color-mute)]">Te enviamos los datos por email. Se confirma al recibir el ingreso.</span>
                    </span>
                  </label>
                </div>
              </div>
              <label className="block text-sm">
                <span className="font-medium">Código de descuento (opcional)</span>
                <input
                  type="text"
                  name="couponCode"
                  maxLength={40}
                  placeholder="Ej. AMIGO20"
                  className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 uppercase outline-none focus:border-[var(--color-ink)]"
                />
              </label>
            </div>
          )}

          <button
            type="submit"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
          >
            {isGuest ? "Reservar" : "Enviar reserva"} <ArrowRight size={14} />
          </button>

          <p className="mt-3 text-xs text-[var(--color-mute)]">
            {user && (user.role === "MEMBER" || user.role === "ADMIN")
              ? "Tu reserva queda confirmada al instante."
              : "Con tarjeta, la reserva se confirma al pagar. Con transferencia, queda reservada y pendiente hasta que confirmemos el ingreso (te enviamos los datos por email)."}
          </p>
        </form>

        {/* Side: tarifas + ocupación */}
        <aside className="space-y-6">
          {/* Tarifas */}
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
            <h3 className="font-display text-base">Tarifas — {ROLE_LABEL[effectiveRole]}</h3>
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
                  {quote1h.discountLabel && (
                    <p className="mt-1 text-xs text-[var(--color-coral-600)]">
                      Incluye {quote1h.discountLabel}
                      {quote1h.discountSource === "role"
                        ? ` (${ROLE_LABEL[effectiveRole].toLowerCase()})`
                        : quote1h.discountSource === "personal"
                        ? " (descuento personal)"
                        : ""}
                      .
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
                  Todos los precios incluyen IVA. Puedes pagar con tarjeta o por transferencia.
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

