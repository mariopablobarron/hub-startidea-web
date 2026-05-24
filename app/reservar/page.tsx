import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ArrowRight, UserPlus, LogIn, CheckCircle2 } from "lucide-react";
import { content, bookableRooms } from "@/lib/content";
import { getCurrentUser, ROLE_LABEL } from "@/lib/auth/roles";
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
  const user = await getCurrentUser();
  const sp = await searchParams;

  // Visitor anónimo: en vez de redirigir directo a /login, mostramos
  // una landing con doble CTA (Registro primario, Login secundario)
  // para reducir fricción del primer-uso. El sistema sigue siendo
  // privado — sin sesión NO ven precios reales ni form de reserva.
  if (!user) {
    return <AnonymousLanding salaSlug={sp.sala} />;
  }

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

/**
 * Landing para visitors anónimos en /reservar.
 *
 * En vez del redirect directo a /login (fricción alta para nuevos), aquí
 * explicamos qué pueden reservar + dos CTAs claros:
 *  - Crear cuenta (primario, magenta) — el camino para nuevos
 *  - Ya tengo cuenta (secundario) — para los que ya tienen
 *
 * Ambos llevan ?callbackUrl=/reservar para que tras login/registro
 * vuelvan automáticamente al sistema de reservas.
 *
 * Si vienen con ?sala=X, lo preservamos para que tras login aterricen
 * directo en esa sala.
 */
function AnonymousLanding({ salaSlug }: { salaSlug?: string }) {
  const callback = salaSlug ? `/reservar?sala=${salaSlug}` : "/reservar";
  const cb = encodeURIComponent(callback);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <header className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-coral-50)] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-coral-700)]">
          <Calendar size={12} />
          Reservas privadas
        </div>
        <h1 className="mt-6 font-display text-4xl tracking-tight md:text-5xl">
          Reservar salas del HUB Startidea
        </h1>
        <p className="mt-4 text-lg text-[var(--color-mute)]">
          Las reservas son <strong>solo para personas registradas</strong>.
          Crear cuenta es gratis, sin contraseña y en 30 segundos.
        </p>
      </header>

      {/* Qué reservan */}
      <section className="mt-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 md:p-8">
        <h2 className="font-display text-lg tracking-tight">Qué puedes reservar</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {bookableRooms.map((r) => (
            <li key={r.slug} className="flex gap-3">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-coral-500)]" />
              <div>
                <div className="font-medium text-[var(--color-ink)]">{r.name}</div>
                <div className="text-xs text-[var(--color-mute)]">{r.subtitle}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-xl bg-[var(--color-paper-2)] p-4 text-sm">
          <div className="font-medium text-[var(--color-ink)]">Tarifa única — 20€/h base + IVA</div>
          <p className="mt-1 text-[var(--color-mute)]">
            PVP <strong>24,20€/h</strong> visitante. Si eres coworker (-30%):{" "}
            <strong>16,94€/h</strong>. Colaborador (-20%): <strong>19,36€/h</strong>.
          </p>
        </div>
      </section>

      {/* Doble CTA */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {/* Crear cuenta — primario */}
        <Link
          href={`/registro?callbackUrl=${cb}`}
          className="group flex flex-col rounded-2xl border-2 border-[var(--color-coral-500)] bg-[var(--color-coral-500)] p-6 text-[var(--color-paper)] transition hover:-translate-y-0.5 hover:bg-[var(--color-coral-600)] hover:border-[var(--color-coral-600)]"
        >
          <div className="flex items-center gap-2">
            <UserPlus size={18} />
            <span className="text-xs uppercase tracking-[0.18em] opacity-80">Nuevo aquí</span>
          </div>
          <div className="mt-3 font-display text-xl tracking-tight">Crear cuenta gratis</div>
          <p className="mt-2 text-sm opacity-90">
            Te enviamos un enlace al email. Sin contraseña, sin coste, en 30 s.
          </p>
          <div className="mt-auto pt-4 flex items-center gap-1.5 text-sm font-medium">
            Empezar
            <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </div>
        </Link>

        {/* Login — secundario */}
        <Link
          href={`/login?callbackUrl=${cb}`}
          className="group flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--color-ink)]"
        >
          <div className="flex items-center gap-2 text-[var(--color-mute)]">
            <LogIn size={18} />
            <span className="text-xs uppercase tracking-[0.18em]">Ya registrado</span>
          </div>
          <div className="mt-3 font-display text-xl tracking-tight">Ya tengo cuenta</div>
          <p className="mt-2 text-sm text-[var(--color-mute)]">
            Magic-link al email o entra con contraseña si la tienes.
          </p>
          <div className="mt-auto pt-4 flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink)]">
            Entrar
            <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      </section>

      <p className="mt-8 text-center text-xs text-[var(--color-mute)]">
        ¿Buscas algo distinto a una reserva por horas? Eventos, formación,
        alquiler de larga estancia…{" "}
        <Link href="/#contacto" className="underline underline-offset-2">
          escríbenos
        </Link>
        .
      </p>
    </main>
  );
}
