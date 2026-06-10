import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { getTransparencyMetrics } from "@/lib/transparencia/metrics";

// Revalidamos cada 5 minutos — los datos son reales pero no necesitamos
// hit a BD por cada visita. Cambio: bajar a 0 si quieres tiempo real literal.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Transparencia — datos reales del HUB",
  description:
    "Ocupación real, reservas, feedback humano. Los números que casi nadie enseña en coworking — aquí están.",
  openGraph: {
    title: "Transparencia · HUB Startidea",
    description:
      "Ocupación real, reservas y feedback humano del HUB. Sin marketing, los datos como son.",
  },
};

export default async function TransparenciaPage() {
  const m = await getTransparencyMetrics();

  const fmtPct = (n: number) => `${n.toFixed(1)}%`.replace(".0%", "%");
  const monthDelta = m.bookingsThisMonth - m.bookingsLastMonth;
  const monthArrow = monthDelta > 0 ? "↑" : monthDelta < 0 ? "↓" : "→";

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10 flex items-center gap-2 text-sm text-[var(--color-mute)]">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-[var(--color-ink)]">
          <ArrowLeft size={14} /> HUB Startidea
        </Link>
      </div>

      <header className="mb-12">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
          Transparencia
        </div>
        <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
          Los datos que casi nadie enseña.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--color-mute)]">
          La mayoría de coworkings te enseñan testimonios cuidados y fotos perfectas.
          Aquí ves la ocupación real de las salas, cuánta gente reserva, y lo que dice
          quien ha pasado. Si una sala está al 8%, lo decimos.
        </p>
        <p className="mt-2 text-xs text-[var(--color-mute)]">
          Última actualización:{" "}
          {m.generatedAt.toLocaleString("es-ES", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}refresco automático cada 5 min · datos en directo desde la BD
        </p>
      </header>

      {/* Bloque 1 — Ocupación por sala */}
      <section className="mb-16">
        <h2 className="font-display text-2xl tracking-tight">Ocupación real de cada sala</h2>
        <p className="mt-2 text-sm text-[var(--color-mute)]">
          Últimos {m.rangeDays} días ({m.periodLabel}). Horas confirmed/completed sobre{" "}
          {m.rooms[0]?.hoursAvailable ?? 0}h teóricas (horario 08:00–21:00, 13h/día).
        </p>

        <ul className="mt-6 space-y-3">
          {m.rooms.map((r) => (
            <li
              key={r.slug}
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium">{r.name}</h3>
                <span className="font-display text-2xl tracking-tight">{fmtPct(r.occupancyPct)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-paper-2)]">
                <div
                  className="h-full bg-[var(--color-coral-500)] transition-all"
                  style={{ width: `${Math.min(100, Math.max(2, r.occupancyPct))}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-[var(--color-mute)]">
                {r.hoursBooked.toFixed(1)}h reservadas · {r.hoursAvailable}h disponibles
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Bloque 2 — Reservas / mes */}
      <section className="mb-16 grid gap-4 md:grid-cols-3">
        <Stat
          label="Reservas este mes"
          value={String(m.bookingsThisMonth)}
          sub={`${monthArrow} ${Math.abs(monthDelta)} vs mes anterior (${m.bookingsLastMonth})`}
        />
        <Stat
          label="Eventos próximos"
          value={String(m.upcomingEvents)}
          sub={m.upcomingEvents === 0 ? "Sin eventos en agenda" : "Publicados, abierto a inscripción"}
        />
        <Stat
          label="Coworkers activos"
          value={String(
            m.activeCoworkers.fixed + m.activeCoworkers.flex + m.activeCoworkers.privateOffice,
          )}
          sub={`${m.activeCoworkers.fixed} fijos · ${m.activeCoworkers.flex} flex · ${m.activeCoworkers.privateOffice} office privado`}
        />
      </section>

      {/* Bloque 3 — Feedback humano */}
      <section className="mb-16">
        <h2 className="font-display text-2xl tracking-tight">Lo que dice quien ha estado</h2>
        <p className="mt-2 text-sm text-[var(--color-mute)]">
          Tras cada reserva COMPLETED enviamos UNA pregunta abierta: <em>¿Cómo te
          fue?</em> Sin escalas 1-10. Sin tracker. Lo leemos personalmente.{" "}
          <strong>{m.feedbackResponded}</strong> respuestas de{" "}
          <strong>{m.feedbackTotal}</strong> enviadas ({fmtPct(m.feedbackResponseRate)}).
        </p>

        {m.feedbackPreviews.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center text-sm text-[var(--color-mute)]">
            Sin respuestas todavía — cuando recibamos las primeras, las verás aquí.
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {m.feedbackPreviews.map((f, i) => (
              <li
                key={i}
                className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5"
              >
                <blockquote className="whitespace-pre-wrap text-sm leading-relaxed">
                  &ldquo;{f.text}&rdquo;
                </blockquote>
                <footer className="mt-3 text-xs text-[var(--color-mute)]">
                  <span className="text-[var(--color-coral-600)]">{f.roomName}</span>
                  {" · "}
                  {f.respondedAt.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                  })}
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Bloque 4 — Lo que NO contamos */}
      <section className="mb-16 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-6">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-coral-600)]" />
          <div className="text-sm leading-relaxed text-[var(--color-ink)]">
            <p className="font-medium">Lo que esta página no enseña (todavía):</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--color-mute)]">
              <li>Ingresos del mes. Cuando estemos preparados, lo verás aquí.</li>
              <li>
                Quién es cada miembro. Privacidad mata transparencia parcial — preferimos
                counts anonimizados.
              </li>
              <li>
                Feedbacks con datos identificables. Solo enseñamos los 3 más recientes y
                solo si la persona habló de su experiencia, no datos personales.
              </li>
            </ul>
            <p className="mt-3 text-[var(--color-mute)]">
              Si encuentras un coworking que enseñe más que esto, dinos cómo lo hacen.
              Copiamos lo bueno.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-line)] pt-8 text-sm text-[var(--color-mute)]">
        <p>
          ¿Sugieres una métrica para añadir?{" "}
          <a href="mailto:hola@hubstartidea.es" className="underline hover:text-[var(--color-ink)]">
            hola@hubstartidea.es
          </a>
          .
        </p>
      </footer>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-mute)]">{label}</div>
      <div className="mt-2 font-display text-4xl tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-[var(--color-mute)]">{sub}</div>
    </div>
  );
}
