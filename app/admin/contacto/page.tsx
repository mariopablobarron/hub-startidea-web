import { content } from "@/lib/content";
import { updateContact } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader } from "../_components/Field";

export default function ContactAdmin() {
  const c = content.contact;
  return (
    <form action={updateContact} className="space-y-6">
      <PageHeader
        title="Contacto"
        back={{ href: "/admin", label: "Dashboard" }}
        description="CTA naranja al final de la home + datos visuales (horario, cómo llegar)."
      />
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <Field label="Eyebrow"><Input name="eyebrow" defaultValue={c.eyebrow} required /></Field>
        <Field label="Título"><Input name="title" defaultValue={c.title} required /></Field>
        <Field label="Descripción"><Textarea name="description" rows={4} defaultValue={c.description} required /></Field>
        <Field label="Horario" hint="Una línea por entrada (usa salto de línea).">
          <Textarea name="schedule" rows={3} defaultValue={c.schedule} required />
        </Field>
        <Field label="Cómo llegar"><Textarea name="directions" rows={3} defaultValue={c.directions} required /></Field>
      </section>
      <SaveBar />
    </form>
  );
}
