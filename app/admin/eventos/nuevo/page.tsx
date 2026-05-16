import { requireAdmin } from "@/lib/auth/roles";
import { createEvent } from "@/lib/events/actions";
import { content } from "@/lib/content";
import { PageHeader } from "../../_components/Field";
import { EventFields } from "../_components/EventFields";

export default async function NuevoEventoPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo evento"
        back={{ href: "/admin/eventos", label: "Eventos" }}
        description="Crea el evento en borrador. Publica cuando esté listo para que aparezca en /eventos."
      />
      <form action={createEvent} encType="multipart/form-data" className="space-y-6">
        <EventFields rooms={content.rooms} />
        <button
          type="submit"
          className="rounded-full bg-[var(--color-ink)] px-6 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
        >
          Crear evento
        </button>
      </form>
    </div>
  );
}
