import { content } from "@/lib/content";
import { updateSite } from "@/lib/admin/actions";
import { Field, Input, SaveBar, PageHeader, FlashBanner } from "../_components/Field";

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
          <Field label="Nombre"><Input name="name" defaultValue={s.name} required /></Field>
          <Field label="URL canónica"><Input name="url" defaultValue={s.url} required /></Field>
        </div>
        <Field label="Tagline"><Input name="tagline" defaultValue={s.tagline} /></Field>
        <Field label="Descripción SEO"><Input name="description" defaultValue={s.description} /></Field>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Teléfono (E.164)"><Input name="phone" defaultValue={s.phone} required /></Field>
          <Field label="Teléfono (display)"><Input name="phoneDisplay" defaultValue={s.phoneDisplay} required /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={s.email} required /></Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Calle"><Input name="addressStreet" defaultValue={s.address.street} required /></Field>
          <Field label="Ciudad"><Input name="addressCity" defaultValue={s.address.city} required /></Field>
          <Field label="Código postal"><Input name="addressPostal" defaultValue={s.address.postal} required /></Field>
          <Field label="País"><Input name="addressCountry" defaultValue={s.address.country} required /></Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Instagram URL"><Input name="instagram" defaultValue={s.social.instagram} required /></Field>
          <Field label="Facebook URL"><Input name="facebook" defaultValue={s.social.facebook} required /></Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Agencia matriz — nombre"><Input name="parentName" defaultValue={s.parent.name} required /></Field>
          <Field label="Agencia matriz — URL"><Input name="parentUrl" defaultValue={s.parent.url} required /></Field>
        </div>
      </section>
      <SaveBar />
    </form>
  );
}
