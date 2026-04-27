import { content } from "@/lib/content";
import { updateHero } from "@/lib/admin/actions";
import { Field, Input, Textarea, SaveBar, PageHeader } from "../_components/Field";

export default function HeroAdmin() {
  const h = content.hero;

  return (
    <form action={updateHero} className="space-y-6">
      <PageHeader
        title="Hero principal"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Lo primero que ve un visitante. El bloque grande del título y el subtítulo."
      />

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <Field label="Eyebrow" hint="Texto pequeño en mayúsculas sobre el título.">
          <Input name="eyebrow" defaultValue={h.eyebrow} required />
        </Field>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Título — comienzo">
            <Input name="titleStart" defaultValue={h.titleStart} />
          </Field>
          <Field label="Título — destacado (cursiva coral)" hint="Las palabras importantes.">
            <Input name="titleEm" defaultValue={h.titleEm} required />
          </Field>
          <Field label="Título — final">
            <Input name="titleEnd" defaultValue={h.titleEnd} />
          </Field>
        </div>

        <Field label="Subtítulo">
          <Textarea name="subtitle" rows={3} defaultValue={h.subtitle} required />
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="CTA principal (botón oscuro)">
            <Input name="ctaPrimary" defaultValue={h.ctaPrimary} required />
          </Field>
          <Field label="CTA secundario (botón borde)">
            <Input name="ctaSecondary" defaultValue={h.ctaSecondary} required />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tagline rotativo (texto fijo)">
            <Input name="rotatingTagline" defaultValue={h.rotatingTagline} />
          </Field>
          <Field label="Palabras rotativas" hint="Separadas por coma.">
            <Input name="rotatingWords" defaultValue={h.rotatingWords.join(", ")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Stats (4 cifras bajo el hero)</h2>
        {[0, 1, 2, 3].map((i) => {
          const s = h.stats[i] ?? { value: "", label: "" };
          const isText = "isText" in s ? (s as { isText?: boolean }).isText : false;
          const suffix = "suffix" in s ? (s as { suffix?: string }).suffix : "";
          return (
            <div key={i} className="grid gap-3 md:grid-cols-[1fr_120px_2fr_120px] md:items-end">
              <Field label={`Valor ${i + 1}`}>
                <Input name={`stat-${i}-value`} defaultValue={s.value} required />
              </Field>
              <Field label="Sufijo" hint="Ej: m²">
                <Input name={`stat-${i}-suffix`} defaultValue={suffix || ""} />
              </Field>
              <Field label="Etiqueta">
                <Input name={`stat-${i}-label`} defaultValue={s.label} required />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`stat-${i}-isText`} defaultChecked={!!isText} />
                Texto (no número)
              </label>
            </div>
          );
        })}
      </section>

      <SaveBar />
    </form>
  );
}
