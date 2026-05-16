import Link from "next/link";
import { Phone, Mail, MapPin, ArrowRight, Clock } from "lucide-react";
import { content } from "@/lib/content";
import { ContactForm } from "./ContactForm";

const site = content.site;
const contact = content.contact;

export function Contact() {
  return (
    <section id="contacto" className="py-24 md:py-32">
      <div className="container-page">
        {/*
          Manual Startidea: magenta es acento (10%). Un bloque CTA tan
          grande sobre fondo magenta rompería la proporción 60/30/10.
          Lo pasamos a grafito (la "tinta" del manual) y mantenemos el
          magenta como acento puntual en separadores/badges/links hover.
        */}
        <div className="overflow-hidden rounded-3xl bg-[var(--color-ink)] text-[var(--color-paper)]">
          <div className="grid gap-12 p-10 md:grid-cols-[1.4fr_1fr] md:p-16">
            <div>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/80">
                <span className="h-px w-8 bg-white" /> {contact.eyebrow}
              </span>
              <h2 className="mt-4 max-w-xl font-display text-4xl tracking-tight md:text-5xl">
                {contact.title}
              </h2>
              <p className="mt-6 max-w-lg text-white/85">
                {contact.description}
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href={`tel:${site.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-white transition hover:bg-black"
                >
                  Llamar al {site.phoneDisplay}
                  <Phone size={14} />
                </a>
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/20"
                >
                  Escribir email
                  <Mail size={14} />
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <InfoCard icon={<MapPin size={16} />} label="Dónde">
                {site.address.street}
                <br />
                {site.address.postal} {site.address.city}
              </InfoCard>
              <InfoCard icon={<Clock size={16} />} label="Horario">
                {contact.schedule.split("\n").map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))}
              </InfoCard>
              <InfoCard icon={<MapPin size={16} />} label="Cómo llegar">
                {contact.directions}
              </InfoCard>
            </div>
          </div>
          <div className="border-t border-white/20 p-10 md:p-16">
            <ContactForm />
          </div>
          <Link
            href={`https://maps.google.com/?q=${encodeURIComponent(`${site.address.street}, ${site.address.city}`)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center justify-between gap-4 border-t border-white/20 px-10 py-5 text-sm transition hover:bg-[var(--color-coral-600)] md:px-16"
          >
            <span>Ver en Google Maps</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function InfoCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/80">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
