import { notFound } from "next/navigation";
import Image from "next/image";
import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { updateEvent, deleteEvent } from "@/lib/events/actions";
import { content } from "@/lib/content";
import { PageHeader, FlashBanner } from "../../_components/Field";
import { EventFields } from "../_components/EventFields";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function EditEventoPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { registrations: { orderBy: { createdAt: "desc" } } },
  });
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar — ${event.title}`}
        back={{ href: "/admin/eventos", label: "Eventos" }}
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {event.published && (
        <Link
          href={`/eventos/${event.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-coral-600)] hover:underline"
        >
          Ver evento público <ExternalLink size={12} />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Form principal */}
        <form action={updateEvent} encType="multipart/form-data" className="space-y-6">
          <input type="hidden" name="id" value={event.id} />
          <EventFields rooms={content.rooms} event={event} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-[var(--color-ink)] px-6 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
            >
              Guardar cambios
            </button>
          </div>
        </form>

        {/* Sidebar: inscritos + borrar */}
        <aside className="space-y-4">
          {event.cover && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[var(--color-line)]">
              <Image src={event.cover} alt="" fill sizes="400px" className="object-cover" />
            </div>
          )}

          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
            <h3 className="font-display text-base">Inscritos ({event.registrations.length})</h3>
            {event.registrations.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-mute)]">Nadie inscrito todavía.</p>
            ) : (
              <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto text-sm">
                {event.registrations.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] pb-2 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.name || r.email}</div>
                      <div className="truncate text-xs text-[var(--color-mute)]">{r.email}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      r.status === "REGISTERED" ? "bg-emerald-50 text-emerald-700" :
                      r.status === "WAITLIST" ? "bg-amber-50 text-amber-700" :
                      r.status === "ATTENDED" ? "bg-blue-50 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form action={deleteEvent}>
            <input type="hidden" name="id" value={event.id} />
            <ConfirmSubmit
              message={`Eliminar el evento "${event.title}" y sus ${event.registrations.length} inscripcion${event.registrations.length === 1 ? "" : "es"}? Esta acción no se puede deshacer.`}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <Trash2 size={14} /> Eliminar evento
            </ConfirmSubmit>
            <p className="mt-2 text-xs text-[var(--color-mute)]">
              Elimina el evento y todas sus inscripciones permanentemente.
            </p>
          </form>
        </aside>
      </div>
    </div>
  );
}
