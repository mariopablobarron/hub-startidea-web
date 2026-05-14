import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Network } from "lucide-react";
import { content } from "@/lib/content";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, organizationSchema } from "@/lib/seo/structuredData";

const site = content.site;
const eco = content.ecosystem;

export const metadata: Metadata = {
  title: "Ecosistema Startidea — los proyectos detrás del HUB",
  description: `${eco.description} Conoce ${site.parent.name} y los proyectos vivos que se cocinan en el HUB.`,
  alternates: { canonical: `${site.url}/ecosistema` },
  openGraph: {
    title: "Ecosistema Startidea — los proyectos detrás del HUB",
    description: eco.description,
    url: `${site.url}/ecosistema`,
    type: "website",
  },
};

// Mismos acentos que la sección home — clases estáticas para Tailwind purge.
const ACCENT: Record<string, { dot: string; bg: string; ring: string; text: string }> = {
  coral: {
    dot: "bg-[var(--color-coral-500)]",
    bg: "bg-[var(--color-coral-500)]/10",
    ring: "ring-[var(--color-coral-500)]/30",
    text: "text-[var(--color-coral-600)]",
  },
  warm: {
    dot: "bg-[#ffae84]",
    bg: "bg-[#ffae84]/15",
    ring: "ring-[#ffae84]/40",
    text: "text-[#c66c3a]",
  },
  earth: {
    dot: "bg-[#9c6b3f]",
    bg: "bg-[#9c6b3f]/12",
    ring: "ring-[#9c6b3f]/30",
    text: "text-[#7a5230]",
  },
  ink: {
    dot: "bg-[var(--color-ink)]",
    bg: "bg-[var(--color-ink)]/8",
    ring: "ring-[var(--color-ink)]/30",
    text: "text-[var(--color-ink)]",
  },
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function EcosistemaPage() {
  return (
    <>
      <JsonLd
        data={[
          organizationSchema(),
          breadcrumbSchema([
            { name: "Inicio", url: site.url },
            { name: "Ecosistema", url: `${site.url}/ecosistema` },
          ]),
        ]}
      />

      <main className="pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="container-page">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-mute)] hover:text-[var(--color-ink)]"
          >
            <ArrowLeft size={14} /> Inicio
          </Link>

          <header className="mt-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">
              <Network size={14} className="text-[var(--color-coral-500)]" />
              {eco.eyebrow}
            </div>
            <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">{eco.title}</h1>
            <p className="mt-6 text-lg text-[var(--color-mute)]">{eco.description}</p>
            <a
              href={eco.ctaUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-600)]"
            >
              {eco.ctaLabel}
              <ArrowUpRight size={14} />
            </a>
          </header>

          <section className="mt-20 space-y-6">
            {eco.projects.map((p) => {
              const accent = ACCENT[p.accent] || ACCENT.coral;
              return (
                <article
                  key={p.url}
                  className={`rounded-3xl border border-[var(--color-line)] ${accent.bg} p-8 md:p-12`}
                >
                  <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
                    <div>
                      <div className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] ${accent.text}`}>
                        <span className={`h-2 w-2 rounded-full ${accent.dot}`} aria-hidden />
                        {p.what || hostname(p.url)}
                      </div>
                      <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
                        {p.name}
                      </h2>
                      <div className="mt-3 text-sm text-[var(--color-mute)]">
                        {hostname(p.url)}
                      </div>
                    </div>
                    <div>
                      <p className="text-lg leading-relaxed text-[var(--color-ink)]">
                        {p.longDescription || p.tagline}
                      </p>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-ink)] hover:text-[var(--color-paper)]"
                      >
                        Visitar {hostname(p.url)}
                        <ArrowUpRight size={14} />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {/* Sección de cierre: cómo trabajan juntos */}
          <section className="mt-24 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-10 md:p-16">
            <div className="max-w-3xl">
              <span className="eyebrow">¿Cómo encajan?</span>
              <h2 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">
                Cuatro proyectos, un mismo principio: ideas con propósito que se llevan a la acción.
              </h2>
              <div className="mt-6 space-y-4 text-[var(--color-mute)]">
                <p>
                  <strong className="text-[var(--color-ink)]">Startidea</strong> es la agencia
                  matriz que diseña y acompaña. <strong className="text-[var(--color-ink)]">Raíz
                  y Acción</strong> es el método que se ha decantado tras más de una década de
                  proyectos: lo abrimos como bien común para que cualquiera lo use.
                </p>
                <p>
                  <strong className="text-[var(--color-ink)]">Tres mil millones de latidos</strong>{" "}
                  es el primer producto digital donde el método se vuelve software. <strong className="text-[var(--color-ink)]">TodoMerchandising</strong>{" "}
                  cierra el círculo: cuando un proyecto necesita materializarse físicamente
                  (camisetas, totebags, packaging con impacto), aquí lo producimos.
                </p>
                <p>
                  El <strong className="text-[var(--color-ink)]">HUB Startidea</strong> es la
                  sede donde todo eso se cocina. También es coworking abierto a la calle: quien
                  alquila una sala o una plaza forma parte (mientras está aquí) de este
                  ecosistema.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/#salas" className="btn-primary">
                  Ver salas y coworking
                </Link>
                <Link href="/metodo" className="btn-ghost">
                  Conoce el método Raíz y Acción
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
