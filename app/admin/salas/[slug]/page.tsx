import Image from "next/image";
import { notFound } from "next/navigation";
import { content } from "@/lib/content";
import { updateRoom, uploadRoomImage } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader, FlashBanner } from "../../_components/Field";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function RoomEditPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const room = content.rooms.find((r) => r.slug === slug);
  if (!room) notFound();

  async function update(formData: FormData) {
    "use server";
    await updateRoom(slug, formData);
  }

  async function upload(formData: FormData) {
    "use server";
    await uploadRoomImage(slug, formData);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar sala — ${room.name}`}
        back={{ href: "/admin/salas", label: "Salas" }}
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {/* Subir imagen — formulario aparte */}
      <form action={upload} encType="multipart/form-data" className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Foto de la sala</h2>
        <div className="flex items-start gap-6">
          <div className="relative aspect-[16/10] w-64 shrink-0 overflow-hidden rounded-xl bg-[var(--color-paper-2)]">
            <Image src={room.image} alt={room.name} fill sizes="256px" className="object-cover" />
          </div>
          <div className="flex-1 space-y-3">
            <Field label="Subir nueva foto" hint="JPG, PNG, WebP o HEIC (móvil). Máximo 15 MB; se optimiza al subir.">
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                required
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-[var(--color-line)] file:bg-[var(--color-paper-2)] file:px-3 file:py-2 file:text-sm hover:file:bg-[var(--color-paper)]"
              />
            </Field>
            <div className="text-xs text-[var(--color-mute)]">
              La foto se redimensiona a 1600 px y se guarda como <code className="rounded bg-[var(--color-paper-2)] px-1">public/images/rooms/{slug}.jpg</code>, reemplazando la actual.
            </div>
            <button type="submit" className="btn-primary">Subir y aplicar</button>
          </div>
        </div>
      </form>

      {/* Datos de la sala */}
      <form action={update} className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre"><Input name="name" defaultValue={room.name} required /></Field>
            <Field label="Subtítulo"><Input name="subtitle" defaultValue={room.subtitle} required /></Field>
          </div>
          <Field label="Frase corta" hint="Aparece en la card del grid de salas.">
            <Textarea name="short" rows={2} defaultValue={room.short} required />
          </Field>
          <Field label="Descripción larga" hint="Página de detalle.">
            <Textarea name="description" rows={5} defaultValue={room.description} required />
          </Field>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Superficie (m²)"><Input type="number" step="0.01" name="area" defaultValue={room.area} required /></Field>
            <Field label="Etiqueta plano"><Input name="planLabel" defaultValue={room.planLabel} required /></Field>
            <Field label="Highlight (badge)" hint="Vacío = sin badge."><Input name="highlight" defaultValue={room.highlight || ""} /></Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
          <h2 className="font-display text-lg">Capacidad (personas)</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Escolar"><Input type="number" min="0" name="capacitySchool" defaultValue={room.capacity.school} required /></Field>
            <Field label="Auditorio"><Input type="number" min="0" name="capacityTheater" defaultValue={room.capacity.theater} required /></Field>
            <Field label="Boardroom"><Input type="number" min="0" name="capacityBoardroom" defaultValue={room.capacity.boardroom ?? ""} /></Field>
            <Field label="Cóctel"><Input type="number" min="0" name="capacityCoctel" defaultValue={room.capacity.coctel ?? ""} /></Field>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
          <Field label="Usos habituales" hint="Una entrada por línea.">
            <Textarea name="uses" rows={5} defaultValue={room.uses.join("\n")} />
          </Field>
          <Field label="Equipamiento" hint="Una entrada por línea.">
            <Textarea name="equipment" rows={6} defaultValue={room.equipment.join("\n")} />
          </Field>
        </section>

        <SaveBar />
      </form>
    </div>
  );
}
