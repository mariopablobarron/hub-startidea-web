import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Info } from "lucide-react";
import { bookableRooms } from "@/lib/content";
import { quotePrice, formatEuros } from "@/lib/bookings/pricing";

// Tarifas son data-driven (faq.json + content.json) y cambian de forma
// poco frecuente. Cache de 1h es razonable — al editar /admin/tarifas
// se hace revalidatePath("/", "layout") que invalida esto también.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Precios y tarifas · HUB Startidea Granada",
  description:
    "Tarifa única transparente: 20€/h + IVA en todas las salas. Descuentos del 30% para coworkers y 20% para colaboradores. Sin sorpresas, sin letra pequeña.",
  openGraph: {
    title: "Precios · HUB Startidea",
    description:
      "Tarifa única 20€/h + IVA en todas las salas. Descuentos transparentes para coworkers y colaboradores.",
  },
  alternates: { canonical: "https://hubstartidea.es/precios" },
};

export default async function PreciosPage() {
  // Calculamos precios reales (con IVA, descuentos aplicados) para 1h
  // en cada sala bookable + cada rol. Esto evita que la página mienta:
  // el número que ve aquí es exactamente lo que verá en /reservar.
  const tariffs = await Promise.all(
    bookableRooms.map(async (room) => {
      const [visitor, member, collaborator] = await Promise.all([
        quotePrice({ roomSlug: room.slug, durationHours: 1, role: "VISITOR" }),
        quotePrice({ roomSlug: room.slug, durationHours: 1, role: "MEMBER" }),
        quotePrice({ roomSlug: room.slug, durationHours: 1, role: "COLLABORATOR" }),
      ]);
      return { room, visitor, member, collaborator };
    }),
  );

  // Si ninguna sala tiene tarifa configurada, no enseñamos tabla vacía.
  const anyQuoted = tariffs.some((t) => t.visitor.quoted);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 text-center">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
          Precios
        </div>
        <h1 className="mt-3 font-display text-4xl tracking-tight md:text-5xl">
          Una tarifa, sin sorpresas.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[var(--color-mute)]">
          20€/hora base imponible en todas las salas, IVA aparte. Los descuentos para
          coworkers y colaboradores se ven aquí — no en un PDF que tienes que pedir.
        </p>
      </header>

      {/* Tabla principal */}
      {anyQuoted ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-line)] bg-[var(--color-paper-2)] text-xs uppercase tracking-[0.14em] text-[var(--color-mute)]">
              <tr>
                <th scope="col" className="px-5 py-4 text-left font-medium">Sala</th>
                <th scope="col" className="px-3 py-4 text-right font-medium">Visitante</th>
                <th scope="col" className="px-3 py-4 text-right font-medium">
                  Colaborador <span className="block text-[10px] normal-case opacity-70">−20%</span>
                </th>
                <th scope="col" className="px-3 py-4 text-right font-medium">
                  Coworker <span className="block text-[10px] normal-case opacity-70">−30%</span>
                </th>
                <th scope="col" className="px-5 py-4" aria-label="Acción"></th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map(({ room, visitor, member, collaborator }) => (
                <tr key={room.slug} className="border-b border-[var(--color-line)] last:border-0">
                  <th scope="row" className="px-5 py-5 text-left">
                    <div className="font-medium text-[var(--color-ink)]">{room.name}</div>
                    <div className="text-xs text-[var(--color-mute)]">
                      {room.area} m² · {room.subtitle}
                    </div>
                  </th>
                  <td className="px-3 py-5 text-right">
                    {visitor.quoted ? (
                      <div>
                        <div className="font-display text-lg tracking-tight">
                          {formatEuros(visitor.totalCents)}
                        </div>
                        <div className="text-[10px] text-[var(--color-mute)]">/hora con IVA</div>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-mute)]">Consultar</span>
                    )}
                  </td>
                  <td className="px-3 py-5 text-right">
                    {collaborator.quoted ? (
                      <div className="text-[var(--color-coral-600)]">
                        <div className="font-display text-lg tracking-tight">
                          {formatEuros(collaborator.totalCents)}
                        </div>
                        <div className="text-[10px] opacity-80">/hora con IVA</div>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-mute)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-5 text-right">
                    {member.quoted ? (
                      <div className="text-[var(--color-coral-600)]">
                        <div className="font-display text-lg tracking-tight">
                          {formatEuros(member.totalCents)}
                        </div>
                        <div className="text-[10px] opacity-80">/hora con IVA</div>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-mute)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-5 text-right">
                    <Link
                      href={`/reservar?sala=${room.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 py-2 text-xs font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
                    >
                      Reservar <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center text-[var(--color-mute)]">
          Estamos terminando de configurar las tarifas. Escríbenos a{" "}
          <a href="mailto:hola@hubstartidea.es" className="underline">
            hola@hubstartidea.es
          </a>{" "}
          y te las pasamos.
        </div>
      )}

      {/* Cómo funciona — la columna que falta en todos los coworkings */}
      <section className="mt-16 grid gap-6 md:grid-cols-3">
        <Step
          n={1}
          title="Visitante = primera vez"
          body="Cualquiera puede reservar online sin crear cuenta. Pagas en Stripe (tarjeta) o por transferencia."
        />
        <Step
          n={2}
          title="Colaborador = red Startidea"
          body="Profesionales y entidades del ecosistema. −20% en todas las reservas. Te lo asignamos manualmente si encajas."
        />
        <Step
          n={3}
          title="Coworker = miembro activo"
          body="Plaza fija o flex en el espacio. −30% sobre tarifa base. Para pedir plaza, escríbenos."
        />
      </section>

      {/* Letra pequeña visible */}
      <section className="mt-12 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-6">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-coral-600)]" />
          <div className="space-y-2 text-sm text-[var(--color-ink)]">
            <p>
              <strong>IVA incluido</strong> en todos los precios mostrados (21% servicios España).
              La base imponible es 20€/hora; con IVA: 24,20€/hora visitante.
            </p>
            <p>
              <strong>Pago</strong>: tarjeta vía Stripe (confirmación inmediata) o transferencia
              bancaria (confirmación cuando llega la transferencia). En ambos casos la sala queda
              reservada al pedirla — si el pago no se completa en 30 min, el slot vuelve a estar
              libre.
            </p>
            <p>
              <strong>Cancelación</strong>: puedes cancelar reservas no iniciadas desde tu cuenta.
              Reembolso íntegro hasta 24h antes; consultar para casos especiales.
            </p>
            <p>
              <strong>Salas no listadas aquí</strong> (Aula 1, Aula 3, Coworking abierto): tienen
              gestión a medida. Escríbenos a{" "}
              <a href="mailto:hola@hubstartidea.es" className="underline hover:no-underline">
                hola@hubstartidea.es
              </a>{" "}
              y te pasamos detalle.
            </p>
          </div>
        </div>
      </section>

      {/* CTA cierre */}
      <section className="mt-16 text-center">
        <h2 className="font-display text-2xl tracking-tight">
          ¿Listo para reservar?
        </h2>
        <p className="mt-2 text-[var(--color-mute)]">
          Sin crear cuenta. Sin formularios largos. Sin sorpresas.
        </p>
        <Link
          href="/reservar"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-coral-500)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-coral-700)]"
        >
          Reservar una sala <ArrowRight size={14} />
        </Link>
      </section>
    </main>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
      <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-coral-700)] text-xs font-medium text-white">
        {n}
      </div>
      <h3 className="mt-4 font-display text-base tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-mute)]">{body}</p>
    </div>
  );
}
