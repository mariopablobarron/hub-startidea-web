import { content } from "@/lib/content";
import { updateSite } from "@/lib/admin/actions";
import { Field, Input, SaveBar, PageHeader, FlashBanner } from "../_components/Field";
import { ValidatedInput, validators } from "../_components/ValidatedField";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function SiteAdmin({ searchParams }: Props) {
  const s = content.site;
  const sp = await searchParams;
  return (
    <form action={updateSite} className="space-y-6">
      <PageHeader
        title="Datos del sitio"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Email, teléfono, dirección, redes y referencia a la agencia matriz."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <ValidatedInput name="name" label="Nombre" defaultValue={s.name} required validate={validators.required()} />
          <ValidatedInput name="url" label="URL canónica" defaultValue={s.url} required validate={validators.url()} />
        </div>
        <Field label="Tagline"><Input name="tagline" defaultValue={s.tagline} /></Field>
        <Field label="Descripción SEO"><Input name="description" defaultValue={s.description} /></Field>

        <div className="grid gap-3 md:grid-cols-3">
          <ValidatedInput
            name="phone"
            label="Teléfono (E.164)"
            hint="Empieza por +"
            defaultValue={s.phone}
            required
            validate={(v) => (/^\+?\d[\d\s]{6,}$/.test(v) ? null : "Formato no válido. Ej: +34 958 04 57 89")}
          />
          <ValidatedInput name="phoneDisplay" label="Teléfono (display)" defaultValue={s.phoneDisplay} required validate={validators.required()} />
          <ValidatedInput name="email" label="Email" type="email" defaultValue={s.email} required validate={validators.email()} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ValidatedInput name="addressStreet" label="Calle" defaultValue={s.address.street} required validate={validators.required()} />
          <ValidatedInput name="addressCity" label="Ciudad" defaultValue={s.address.city} required validate={validators.required()} />
          <ValidatedInput
            name="addressPostal"
            label="Código postal"
            defaultValue={s.address.postal}
            required
            validate={(v) => (/^\d{5}$/.test(v) ? null : "5 dígitos.")}
          />
          <ValidatedInput name="addressCountry" label="País" defaultValue={s.address.country} required validate={validators.required()} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ValidatedInput name="instagram" label="Instagram URL" defaultValue={s.social.instagram} required validate={validators.url()} />
          <ValidatedInput name="facebook" label="Facebook URL" defaultValue={s.social.facebook} required validate={validators.url()} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ValidatedInput name="parentName" label="Agencia matriz — nombre" defaultValue={s.parent.name} required validate={validators.required()} />
          <ValidatedInput name="parentUrl" label="Agencia matriz — URL" defaultValue={s.parent.url} required validate={validators.url()} />
        </div>
      </section>
      <SaveBar />
    </form>
  );
}
