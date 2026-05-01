import { faq } from "@/lib/chat/faqShape";
import { content } from "@/lib/content";
import { updateFaq } from "@/lib/admin/faqActions";
import { Field, Input, Textarea, SaveBar, PageHeader, FlashBanner } from "../_components/Field";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function FaqAdmin({ searchParams }: Props) {
  const t = faq.tariffs;
  const sp = await searchParams;
  return (
    <form action={updateFaq} className="space-y-6">
      <PageHeader
        title="FAQ del chatbot"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Tarifas, horarios y respuestas que el bot público usa para responder. Si dejas un precio vacío, el bot derivará al humano cuando alguien pregunte por esa sala."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {/* COWORKING */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Coworking abierto</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="€ / día"><Input name="cw-perDay" type="number" step="0.01" defaultValue={t.coworkingOpen.perDay ?? ""} /></Field>
          <Field label="€ / semana"><Input name="cw-perWeek" type="number" step="0.01" defaultValue={t.coworkingOpen.perWeek ?? ""} /></Field>
          <Field label="€ / mes"><Input name="cw-perMonth" type="number" step="0.01" defaultValue={t.coworkingOpen.perMonth ?? ""} /></Field>
        </div>
        <Field label="Packs flexibles" hint="Una entrada por línea (ej: '5 días/mes — 80€')."><Textarea name="cw-packs" rows={3} defaultValue={t.coworkingOpen.packs.join("\n")} /></Field>
        <Field label="Notas"><Input name="cw-notes" defaultValue={t.coworkingOpen.notes} /></Field>
      </section>

      {/* OFFICE PRIVADO */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Office privado</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="€ / mes"><Input name="op-perMonth" type="number" step="0.01" defaultValue={t.officePrivate.perMonth ?? ""} /></Field>
          <Field label="Estancia mínima"><Input name="op-minStay" defaultValue={t.officePrivate.minStay} /></Field>
          <Field label="Notas"><Input name="op-notes" defaultValue={t.officePrivate.notes} /></Field>
        </div>
      </section>

      {/* SALAS */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Tarifas por sala</h2>
        {Object.entries(t.rooms).map(([slug, r]) => {
          const room = content.rooms.find((x) => x.slug === slug);
          return (
            <div key={slug} className="space-y-2 rounded-xl border border-[var(--color-line)] p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-base">{room?.name ?? slug}</h3>
                <span className="text-xs text-[var(--color-mute)]">{room?.subtitle}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <Field label="€/hora"><Input name={`r-${slug}-perHour`} type="number" step="0.01" defaultValue={"perHour" in r ? r.perHour ?? "" : ""} /></Field>
                <Field label="€/medio día"><Input name={`r-${slug}-halfDay`} type="number" step="0.01" defaultValue={"halfDay" in r ? r.halfDay ?? "" : ""} /></Field>
                <Field label="€/día"><Input name={`r-${slug}-fullDay`} type="number" step="0.01" defaultValue={"fullDay" in r ? r.fullDay ?? "" : ""} /></Field>
                <Field label="€/evento"><Input name={`r-${slug}-event`} type="number" step="0.01" defaultValue={"event" in r ? r.event ?? "" : ""} /></Field>
                <Field label="€/sesión 2h"><Input name={`r-${slug}-session2h`} type="number" step="0.01" defaultValue={"session2h" in r ? r.session2h ?? "" : ""} /></Field>
                <Field label="€/episodio editado"><Input name={`r-${slug}-editedEpisode`} type="number" step="0.01" defaultValue={"editedEpisode" in r ? r.editedEpisode ?? "" : ""} /></Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Reserva mínima"><Input name={`r-${slug}-minBooking`} defaultValue={"minBooking" in r ? r.minBooking ?? "" : ""} /></Field>
                <Field label="Notas"><Input name={`r-${slug}-notes`} defaultValue={r.notes} /></Field>
              </div>
            </div>
          );
        })}
      </section>

      {/* DESCUENTOS Y TRIAL */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Descuentos y prueba</h2>
        <Field label="Descuentos" hint="Una entrada por línea. Ej: '−10% para cooperativas y ONG'.">
          <Textarea name="discounts" rows={3} defaultValue={t.discounts.join("\n")} />
        </Field>
        <Field label="Política de prueba (trial)"><Textarea name="trial" rows={2} defaultValue={t.trial} /></Field>
      </section>

      {/* HORARIO */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Horario</h2>
        <Field label="Horario habitual"><Input name="openHours" defaultValue={faq.schedule.openHours} /></Field>
        <Field label="Fin de semana"><Input name="weekend" defaultValue={faq.schedule.weekend} /></Field>
        <Field label="Acceso 24h" hint="Si aplica para office privado o coworking."><Input name="access24h" defaultValue={faq.schedule.access24h} /></Field>
        <Field label="Festivos"><Input name="holidays" defaultValue={faq.schedule.holidays} /></Field>
      </section>

      {/* LOCALIZACIÓN */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Localización</h2>
        <Field label="Dirección"><Input name="address" defaultValue={faq.location.address} /></Field>
        <Field label="Barrio"><Input name="neighborhood" defaultValue={faq.location.neighborhood} /></Field>
        <Field label="Transporte público"><Input name="publicTransport" defaultValue={faq.location.publicTransport} /></Field>
        <Field label="Parking"><Input name="parking" defaultValue={faq.location.parking} /></Field>
        <Field label="Accesibilidad"><Input name="accessibility" defaultValue={faq.location.accessibility} /></Field>
      </section>

      {/* POLÍTICAS */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Políticas</h2>
        <Field label="Mascotas"><Input name="pets" defaultValue={faq.policies.pets} /></Field>
        <Field label="Tabaco"><Input name="smoking" defaultValue={faq.policies.smoking} /></Field>
        <Field label="Cocina/café"><Input name="kitchen" defaultValue={faq.policies.kitchen} /></Field>
        <Field label="Wifi"><Input name="wifi" defaultValue={faq.policies.wifi} /></Field>
      </section>

      {/* EXTRAS */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Extras / servicios</h2>
        <Field label="Servicios opcionales" hint="Una línea por servicio. Ej: 'Catering bajo demanda — desde 12€/persona'.">
          <Textarea name="extras" rows={5} defaultValue={faq.extras.join("\n")} />
        </Field>
      </section>

      {/* FAQ */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Preguntas frecuentes (5 huecos)</h2>
        <p className="text-xs text-[var(--color-mute)]">Si quedan vacías, el bot solo usará tarifas + horarios + políticas.</p>
        {[0, 1, 2, 3, 4].map((i) => {
          const f = faq.frequentQuestions[i] ?? { q: "", a: "" };
          return (
            <div key={i} className="grid gap-3 md:grid-cols-2">
              <Field label={`Pregunta ${i + 1}`}><Input name={`fq-${i}-q`} defaultValue={f.q} /></Field>
              <Field label={`Respuesta ${i + 1}`}><Textarea name={`fq-${i}-a`} rows={2} defaultValue={f.a} /></Field>
            </div>
          );
        })}
      </section>

      {/* HANDOFF */}
      <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h2 className="font-display text-lg">Derivación a humano</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Número WhatsApp" hint="Formato +34XXXXXXXXX"><Input name="whatsappNumber" defaultValue={faq.handoff.whatsappNumber} /></Field>
          <Field label="Email contacto"><Input name="email" type="email" defaultValue={faq.handoff.email} /></Field>
        </div>
        <Field label="Mensaje pre-rellenado WhatsApp"><Input name="whatsappMessage" defaultValue={faq.handoff.whatsappMessage} /></Field>
        <Field label="Triggers de derivación" hint="Una línea por trigger.">
          <Textarea name="triggers" rows={4} defaultValue={faq.handoff.triggers.join("\n")} />
        </Field>
      </section>

      <SaveBar />
    </form>
  );
}
