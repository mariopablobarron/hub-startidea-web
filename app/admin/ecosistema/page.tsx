import { content } from "@/lib/content";
import { updateEcosystem } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader, FlashBanner } from "../_components/Field";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function EcosystemAdmin({ searchParams }: Props) {
  const e = content.ecosystem;
  const sp = await searchParams;

  // Cada proyecto en una línea: "nombre|tagline|url|accent"
  const projectsDefault = e.projects
    .map((p) => `${p.name}|${p.tagline}|${p.url}|${p.accent}`)
    .join("\n");

  return (
    <form action={updateEcosystem} className="space-y-6">
      <PageHeader
        title="Ecosistema Startidea"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Bloque que explica el ecosistema completo (Startidea + proyectos hermanos). También aparece en la cinta del footer."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <Field label="Eyebrow"><Input name="eyebrow" defaultValue={e.eyebrow} required /></Field>
        <Field label="Título"><Input name="title" defaultValue={e.title} required /></Field>
        <Field label="Descripción">
          <Textarea name="description" rows={3} defaultValue={e.description} required />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Texto CTA principal"><Input name="ctaLabel" defaultValue={e.ctaLabel} required /></Field>
          <Field label="URL CTA principal">
            <Input name="ctaUrl" type="url" defaultValue={e.ctaUrl} required />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Proyectos hermanos</h2>
        <Field
          label="Lista de proyectos"
          hint={
            'Una línea por proyecto, formato "nombre|tagline|url|accent". ' +
            "Accents válidos: coral, warm, earth, ink. " +
            "Ej: Startidea|Agencia de innovación social|https://startidea.es|coral"
          }
        >
          <Textarea name="projects" rows={6} defaultValue={projectsDefault} required />
        </Field>
        <p className="text-xs text-[var(--color-mute)]">
          Los proyectos aparecen como tarjetas en la sección Ecosistema y como cinta de enlaces
          en el footer. El primero suele ser Startidea (matriz).
        </p>
      </section>

      <SaveBar />
    </form>
  );
}
