import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { content } from "@/lib/content";
import { PageHeader, FlashBanner } from "../_components/Field";
import { upsertPricing, deletePricing } from "@/lib/pricing/actions";
import { UNIT_LABEL } from "@/lib/bookings/pricing";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import type { PricingUnit } from "@prisma/client";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

const UNITS: PricingUnit[] = ["PER_HOUR", "HALF_DAY", "FULL_DAY", "EVENT", "PER_SESSION", "PER_DAY"];

export const dynamic = "force-dynamic";

export default async function AdminTarifasPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  // Salas reservables + tarifas actuales
  const rooms = content.rooms.filter((r) => r.bookable !== false);
  const all = await prisma.pricing.findMany({
    orderBy: [{ roomSlug: "asc" }, { unit: "asc" }],
  });

  // Agrupar por sala
  const byRoom: Record<string, typeof all> = {};
  for (const p of all) {
    if (!byRoom[p.roomSlug]) byRoom[p.roomSlug] = [];
    byRoom[p.roomSlug].push(p);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarifas"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Editor legacy. Las tarifas ya no se leen de aquí."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm">
        <div className="font-medium text-amber-900">⚠ Editor deprecated desde 2026-05-18</div>
        <p className="mt-2 text-amber-900/90">
          Las tarifas reales que usa el chatbot, el calculador de presupuesto del
          agente de voz y el flujo de reserva en /reservar ahora se leen de{" "}
          <code className="rounded bg-amber-100 px-1">data/faq.json</code> (fuente única).
        </p>
        <p className="mt-2 text-amber-900/90">
          Para cambiar tarifas, edita desde{" "}
          <a href="/admin/faq" className="font-medium underline">/admin/faq</a> → sección
          &ldquo;Tarifas por sala&rdquo;. Los cambios se commitean a GitHub y aplican
          en el siguiente redeploy.
        </p>
        <p className="mt-2 text-amber-900/90">
          Este panel sigue editando el modelo Prisma <code>Pricing</code> antiguo, pero{" "}
          <strong>NO afecta a precios reales</strong>. Se mantiene para no romper la BD
          mientras dura el sistema custom; muere cuando Cal.com Fase 6 esté lista.
        </p>
      </div>

      {rooms.map((room) => (
        <section key={room.slug} className="space-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl tracking-tight">{room.name}</h2>
            <span className="text-xs text-[var(--color-mute)]">{room.subtitle}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">
                <tr className="border-b border-[var(--color-line)]">
                  <th className="py-2 text-left font-medium">Unidad</th>
                  <th className="px-2 py-2 text-right font-medium">Cliente €</th>
                  <th className="px-2 py-2 text-right font-medium">Coworker €</th>
                  <th className="px-2 py-2 text-right font-medium">Colaborador €</th>
                  <th className="px-2 py-2 text-center font-medium">Activa</th>
                  <th className="py-2 pl-2 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {UNITS.map((unit) => {
                  const existing = (byRoom[room.slug] || []).find((p) => p.unit === unit);
                  return (
                    <tr key={unit} className="border-b border-[var(--color-line)]/60 last:border-0">
                      <td className="py-2 pr-2 align-middle">
                        <form action={upsertPricing} className="contents">
                          <input type="hidden" name="roomSlug" value={room.slug} />
                          <input type="hidden" name="unit" value={unit} />
                          {existing && <input type="hidden" name="id" value={existing.id} />}
                          <span className="font-medium">{UNIT_LABEL[unit]}</span>
                        </form>
                      </td>
                      {/* Cada fila es un form completo. La estructura del table dificulta
                          envolver el tr en un form, así que envolvemos cada input/button
                          en su propio form vía formAction. */}
                      <td className="px-2 py-2 text-right">
                        <input
                          form={`pricing-${room.slug}-${unit}`}
                          type="text"
                          inputMode="decimal"
                          name="clientEuros"
                          defaultValue={existing?.clientCents != null ? (existing.clientCents / 100).toFixed(2) : ""}
                          placeholder="—"
                          className="w-20 rounded-lg border border-[var(--color-line)] bg-white px-2 py-1 text-right text-sm outline-none focus:border-[var(--color-ink)]"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          form={`pricing-${room.slug}-${unit}`}
                          type="text"
                          inputMode="decimal"
                          name="memberEuros"
                          defaultValue={existing?.memberCents != null ? (existing.memberCents / 100).toFixed(2) : ""}
                          placeholder="—"
                          className="w-20 rounded-lg border border-[var(--color-line)] bg-white px-2 py-1 text-right text-sm outline-none focus:border-[var(--color-ink)]"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          form={`pricing-${room.slug}-${unit}`}
                          type="text"
                          inputMode="decimal"
                          name="collaboratorEuros"
                          defaultValue={existing?.collaboratorCents != null ? (existing.collaboratorCents / 100).toFixed(2) : ""}
                          placeholder="—"
                          className="w-20 rounded-lg border border-[var(--color-line)] bg-white px-2 py-1 text-right text-sm outline-none focus:border-[var(--color-ink)]"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          form={`pricing-${room.slug}-${unit}`}
                          type="checkbox"
                          name="active"
                          defaultChecked={existing?.active !== false}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <form
                          id={`pricing-${room.slug}-${unit}`}
                          action={upsertPricing}
                          className="inline"
                        >
                          <input type="hidden" name="roomSlug" value={room.slug} />
                          <input type="hidden" name="unit" value={unit} />
                          {existing && <input type="hidden" name="id" value={existing.id} />}
                          <button
                            type="submit"
                            className="rounded-full bg-[var(--color-ink)] px-3 py-1 text-xs text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
                          >
                            {existing ? "Guardar" : "Crear"}
                          </button>
                        </form>
                        {existing && (
                          <form action={deletePricing} className="ml-1 inline">
                            <input type="hidden" name="id" value={existing.id} />
                            <ConfirmSubmit
                              message={`Eliminar la tarifa de ${room.name} · ${UNIT_LABEL[unit]}?`}
                              className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                            >
                              ×
                            </ConfirmSubmit>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
