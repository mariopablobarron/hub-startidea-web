import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { PageHeader, FlashBanner } from "../_components/Field";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminEventosPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    take: 100,
    include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Talleres, podcasts, encuentros. Borrador no aparece en /eventos hasta que publicas."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      <div>
        <Link
          href="/admin/eventos/nuevo"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
        >
          <Plus size={14} /> Crear evento
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-line)] bg-[var(--color-paper-2)]">
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Inscritos</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--color-mute)]">No hay eventos todavía.</td></tr>
            )}
            {events.map((e) => (
              <tr key={e.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper-2)]/40">
                <td className="px-4 py-3">
                  <div className="font-medium">{e.startsAt.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  <div className="text-xs text-[var(--color-mute)]">{e.startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</div>
                </td>
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3">
                  {e.published ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Publicado</span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Borrador</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {e._count.registrations}
                  {e.capacity ? ` / ${e.capacity}` : ""}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    {e.published && (
                      <Link href={`/eventos/${e.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs hover:border-[var(--color-ink)]">
                        Ver <ExternalLink size={10} />
                      </Link>
                    )}
                    <Link href={`/admin/eventos/${e.id}`} className="rounded-full bg-[var(--color-ink)] px-3 py-1 text-xs font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]">
                      Editar
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
