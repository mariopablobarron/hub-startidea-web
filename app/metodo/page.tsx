import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, GitBranch } from "lucide-react";
import { content } from "@/lib/content";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/structuredData";

const site = content.site;
const m = content.methodRaizAccion;

export const metadata: Metadata = {
  title: `${m.label} — Método ${site.parent.name} para llevar ideas a la acción`,
  description: m.description,
  alternates: { canonical: `${site.url}/metodo` },
  openGraph: {
    title: `${m.label} — Método de la casa`,
    description: m.description,
    url: `${site.url}/metodo`,
    type: "article",
  },
};

// HowTo schema — útil para que Google muestre rich results de "cómo".
function howToSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: m.label,
    description: m.description,
    step: m.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.description,
    })),
  };
}

export default function MetodoPage() {
  return (
    <>
      <JsonLd
        data={[
          howToSchema(),
          breadcrumbSchema([
            { name: "Inicio", url: site.url },
            { name: m.label, url: `${site.url}/metodo` },
          ]),
        ]}
      />

      <main className="bg-gradient-to-b from-[var(--color-paper)] to-[var(--color-paper-2)] pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="container-page">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-mute)] hover:text-[var(--color-ink)]"
          >
            <ArrowLeft size={14} /> Inicio
          </Link>

          <header className="mt-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">
              <GitBranch size={14} className="text-[#c98d5b]" />
              {m.eyebrow}
            </div>
            <div className="mt-4 font-display text-sm tracking-[0.3em] text-[#c98d5b]">
              {m.label.toUpperCase()}
            </div>
            <h1 className="mt-2 font-display text-5xl tracking-tight md:text-6xl">{m.title}</h1>
            <p className="mt-6 text-lg text-[var(--color-mute)]">{m.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={m.url}
                target="_blank"
                rel="noreferrer noopener"
                className="btn-primary"
              >
                {m.ctaLabel}
                <ArrowUpRight size={14} />
              </a>
              <Link href="/#contacto" className="btn-ghost">
                Hablamos de tu proyecto
              </Link>
            </div>
          </header>

          {/* 4 pasos en visual de árbol */}
          <section className="mt-20">
            <h2 className="font-display text-3xl tracking-tight md:text-4xl">
              Las cuatro fases
            </h2>
            <p className="mt-3 max-w-2xl text-[var(--color-mute)]">
              No son etapas estancas: en proyectos reales se vuelve atrás, se itera, se prueba.
              La secuencia es una brújula, no un guion.
            </p>

            <ol className="mt-12 space-y-6">
              {m.steps.map((s) => (
                <li
                  key={s.step}
                  className="grid gap-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 md:grid-cols-[140px_1fr] md:p-12"
                >
                  <div>
                    <div className="font-display text-6xl tracking-tight text-[#c98d5b]">
                      {s.step}
                    </div>
                    <div className="mt-2 font-display text-2xl tracking-tight">{s.title}</div>
                  </div>
                  <p className="text-lg leading-relaxed text-[var(--color-ink)]/85">
                    {s.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Quién lo usa */}
          <section className="mt-24 grid gap-8 md:grid-cols-2">
            <div>
              <span className="eyebrow">¿Para quién es?</span>
              <h2 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">
                Quien tiene una idea y no sabe por dónde empezar.
              </h2>
            </div>
            <ul className="grid gap-3 self-start">
              {[
                "Emprendedoras y emprendedores con una idea joven que necesitan tronco",
                "Fundaciones que quieren llevar un programa a la calle con sentido",
                "Empresas con propósito que quieren testar un producto sin quemar capital",
                "Administraciones públicas con un mandato y poco margen de error",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 text-sm"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c98d5b]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* CTA hacia raizyaccion.hubstartidea.es */}
          <section className="mt-24 rounded-3xl border border-[var(--color-line)] bg-gradient-to-br from-[#3a2a1c] via-[#4a3a2a] to-[#2a1f15] p-10 text-[var(--color-paper)] md:p-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl tracking-tight md:text-4xl">
                El método completo, abierto.
              </h2>
              <p className="mt-4 text-[var(--color-paper)]/80">
                Tenemos un sitio dedicado donde el método se documenta paso a paso, con
                ejemplos y plantillas descargables. Lo abrimos como bien común para que
                cualquiera pueda usarlo.
              </p>
              <a
                href={m.url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-paper)] px-6 py-3 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-coral-500)] hover:text-[var(--color-paper)]"
              >
                {m.ctaLabel}
                <ArrowUpRight size={14} />
              </a>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
