import { content } from "@/lib/content";
import { updateCommunity } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader } from "../_components/Field";

const ICONS = ["Sparkles", "Heart", "Network", "Users", "Mic", "Radio", "Video", "GraduationCap", "Calendar"];

export default function CommunityAdmin() {
  const c = content.community;
  return (
    <form action={updateCommunity} className="space-y-6">
      <PageHeader
        title="Comunidad"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Sección 'No alquilamos metros cuadrados, conectamos personas'."
      />

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <Field label="Eyebrow"><Input name="eyebrow" defaultValue={c.eyebrow} required /></Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Título — comienzo"><Input name="titleStart" defaultValue={c.titleStart} /></Field>
          <Field label="Título — destacado coral"><Input name="titleEm" defaultValue={c.titleEm} required /></Field>
        </div>
        <Field label="Descripción"><Textarea name="description" rows={4} defaultValue={c.description} required /></Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">3 pilares</h2>
        {[0, 1, 2].map((i) => {
          const p = c.pillars[i] ?? { icon: "Sparkles", title: "", text: "" };
          return (
            <div key={i} className="grid gap-3 md:grid-cols-[140px_1fr_2fr]">
              <Field label="Icono">
                <select name={`pillar-${i}-icon`} defaultValue={p.icon} className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm">
                  {ICONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Título"><Input name={`pillar-${i}-title`} defaultValue={p.title} required /></Field>
              <Field label="Texto"><Textarea name={`pillar-${i}-text`} rows={3} defaultValue={p.text} required /></Field>
            </div>
          );
        })}
      </section>

      <SaveBar />
    </form>
  );
}
