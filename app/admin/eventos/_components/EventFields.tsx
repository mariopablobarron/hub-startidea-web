import type { Event } from "@prisma/client";

/**
 * Campos compartidos entre crear/editar evento. Acepta `event` opcional
 * para pre-rellenar; sin él, todo en blanco (modo crear).
 *
 * Las fechas se pintan como datetime-local (que usa la zona local del
 * navegador). Sin TZ explícita basta para el caso del HUB (todo en
 * Europe/Madrid).
 */

function toLocalInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  // YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventFields({
  rooms,
  event,
}: {
  rooms: Array<{ slug: string; name: string }>;
  event?: Event;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <label className="block text-sm">
          <span className="font-medium">Título</span>
          <input
            type="text"
            name="title"
            required
            maxLength={160}
            defaultValue={event?.title}
            placeholder="Ej. Encuentro Startidea — innovación social en Granada"
            className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Descripción</span>
          <textarea
            name="description"
            required
            rows={8}
            maxLength={5000}
            defaultValue={event?.description}
            placeholder="Programa, ponentes, qué se llevan los asistentes, qué tienen que traer..."
            className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
          />
          <p className="mt-1 text-xs text-[var(--color-mute)]">
            Salto de línea = párrafo. Hasta 5000 caracteres.
          </p>
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Cuándo y dónde</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Inicio</span>
            <input
              type="datetime-local"
              name="startsAt"
              required
              defaultValue={toLocalInput(event?.startsAt)}
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Fin</span>
            <input
              type="datetime-local"
              name="endsAt"
              required
              defaultValue={toLocalInput(event?.endsAt)}
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Sala del HUB (opcional)</span>
            <select
              name="roomSlug"
              defaultValue={event?.roomSlug || ""}
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
            >
              <option value="">— Sin asignar —</option>
              {rooms.map((r) => (
                <option key={r.slug} value={r.slug}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Ubicación externa (opcional)</span>
            <input
              type="text"
              name="externalLocation"
              defaultValue={event?.externalLocation || ""}
              placeholder="Si es fuera del HUB"
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Cupo y publicación</h2>
        <label className="block text-sm">
          <span className="font-medium">Plazas máximas (opcional)</span>
          <input
            type="number"
            name="capacity"
            min="1"
            max="500"
            defaultValue={event?.capacity || ""}
            placeholder="Vacío = sin límite"
            className="mt-1 block w-full max-w-xs rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
          />
        </label>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={event?.published || false} />
            <span>Publicado (aparece en /eventos)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublic" defaultChecked={event?.isPublic !== false} />
            <span>Público (cualquiera puede inscribirse)</span>
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Imagen de portada</h2>
        {event?.cover && (
          <p className="text-xs text-[var(--color-mute)]">
            Actual: <code className="rounded bg-[var(--color-paper-2)] px-1">{event.cover}</code>
          </p>
        )}
        <input
          type="file"
          name="cover"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-[var(--color-line)] file:bg-[var(--color-paper-2)] file:px-3 file:py-2 file:text-sm hover:file:bg-[var(--color-paper)]"
        />
        <p className="text-xs text-[var(--color-mute)]">
          Opcional. Si subes nueva, se optimiza a 1600px JPG q82 y reemplaza la anterior. Hasta 15 MB.
        </p>
      </section>
    </div>
  );
}
