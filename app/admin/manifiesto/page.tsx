import { content } from "@/lib/content";
import { updateManifesto } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader, FlashBanner } from "../_components/Field";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ManifestoAdmin({ searchParams }: Props) {
  const m = content.manifesto;
  const sp = await searchParams;

  return (
    <form action={updateManifesto} className="space-y-6">
      <PageHeader
        title="Manifiesto"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Bloque tras el Hero que cuenta las dos caras del HUB (espacio físico + ecosistema)."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <Field label="Eyebrow"><Input name="eyebrow" defaultValue={m.eyebrow} required /></Field>
        <Field label="Título"><Input name="title" defaultValue={m.title} required /></Field>
        <Field label="Intro" hint="Texto bajo el título.">
          <Textarea name="intro" rows={3} defaultValue={m.intro} required />
        </Field>
      </section>

      {[0, 1].map((i) => {
        const p = m.pillars[i];
        return (
          <section
            key={i}
            className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
          >
            <h2 className="font-display text-lg">Pilar {i + 1}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Etiqueta (chip pequeño)">
                <Input name={`pillar-${i}-label`} defaultValue={p?.label} required />
              </Field>
              <Field label="Título del pilar">
                <Input name={`pillar-${i}-title`} defaultValue={p?.title} required />
              </Field>
            </div>
            <Field label="Descripción">
              <Textarea name={`pillar-${i}-description`} rows={3} defaultValue={p?.description} required />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Texto del CTA">
                <Input name={`pillar-${i}-ctaLabel`} defaultValue={p?.ctaLabel} required />
              </Field>
              <Field label="Destino del CTA" hint="Ancla #salas o URL.">
                <Input name={`pillar-${i}-ctaHref`} defaultValue={p?.ctaHref} required />
              </Field>
            </div>
            <Field label="Lista de items" hint="Una línea por item.">
              <Textarea
                name={`pillar-${i}-items`}
                rows={5}
                defaultValue={p?.items?.join("\n")}
                required
              />
            </Field>
          </section>
        );
      })}

      <SaveBar />
    </form>
  );
}
