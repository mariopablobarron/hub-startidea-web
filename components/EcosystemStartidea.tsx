import { ArrowUpRight } from "lucide-react";
import { content } from "@/lib/content";

const eco = content.ecosystem;

// Mapeo accent → clases de color para los headers de cada card. Mantenemos
// los acentos en clases estáticas para que Tailwind no los purgue.
const ACCENT_CLASS: Record<string, { dot: string; hover: string }> = {
  coral: {
    dot: "bg-[var(--color-coral-500)]",
    hover: "group-hover:text-[var(--color-coral-500)]",
  },
  warm: {
    dot: "bg-[#ffae84]",
    hover: "group-hover:text-[#ffae84]",
  },
  earth: {
    dot: "bg-[#9c6b3f]",
    hover: "group-hover:text-[#c98d5b]",
  },
  ink: {
    dot: "bg-[var(--color-ink)]",
    hover: "group-hover:text-[var(--color-ink)]",
  },
};

export function EcosystemStartidea() {
  return (
    <section id="ecosistema" className="py-24 md:py-32">
      <div className="container-page">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <span className="eyebrow">{eco.eyebrow}</span>
            <h2 className="mt-4 font-display text-4xl tracking-tight md:text-5xl">
              {eco.title}
            </h2>
            <p className="mt-6 max-w-md text-[var(--color-mute)]">
              {eco.description}
            </p>
            <a
              href={eco.ctaUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-600)]"
            >
              {eco.ctaLabel}
              <ArrowUpRight size={14} />
            </a>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {eco.projects.map((p) => {
              const accent = ACCENT_CLASS[p.accent] || ACCENT_CLASS.coral;
              return (
                <li key={p.name}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex h-full flex-col justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} aria-hidden />
                        <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">
                          {hostnameOf(p.url)}
                        </span>
                      </div>
                      <h3
                        className={`mt-4 font-display text-2xl tracking-tight transition ${accent.hover}`}
                      >
                        {p.name}
                      </h3>
                      <p className="mt-3 text-sm text-[var(--color-mute)]">{p.tagline}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink)]">
                      Visitar
                      <ArrowUpRight
                        size={14}
                        className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
