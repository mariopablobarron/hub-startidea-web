import { content } from "@/lib/content";
import { updateMethodRaizAccion } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader, FlashBanner } from "../_components/Field";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function MethodAdmin({ searchParams }: Props) {
  const m = content.methodRaizAccion;
  const sp = await searchParams;

  // Serializamos steps a "número|título|descripción" línea-a-línea para edición simple.
  const stepsDefault = m.steps.map((s) => `${s.step}|${s.title}|${s.description}`).join("\n");

  return (
    <form action={updateMethodRaizAccion} className="space-y-6">
      <PageHeader
        title="Método Raíz y Acción"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Bloque destacado del método de la casa. CTA al sitio externo de Raíz y Acción."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Eyebrow"><Input name="eyebrow" defaultValue={m.eyebrow} required /></Field>
          <Field label="Etiqueta (marca método)"><Input name="label" defaultValue={m.label} required /></Field>
        </div>
        <Field label="Título"><Input name="title" defaultValue={m.title} required /></Field>
        <Field label="Descripción">
          <Textarea name="description" rows={4} defaultValue={m.description} required />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="URL externa" hint="https://raizyaccion.hubstartidea.es">
            <Input name="url" type="url" defaultValue={m.url} required />
          </Field>
          <Field label="Texto del CTA"><Input name="ctaLabel" defaultValue={m.ctaLabel} required /></Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Pasos del método</h2>
        <Field
          label="Pasos"
          hint='Una línea por paso, formato "número|título|descripción". Ej: 1|Raíz|Entender la idea, las personas...'
        >
          <Textarea name="steps" rows={6} defaultValue={stepsDefault} required />
        </Field>
      </section>

      <SaveBar />
    </form>
  );
}
