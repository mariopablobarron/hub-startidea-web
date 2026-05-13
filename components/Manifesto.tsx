import Link from "next/link";
import { ArrowRight, Building2, Sprout, Check } from "lucide-react";
import { content } from "@/lib/content";

const m = content.manifesto;

// Iconos por pilar — los mapeo por posición para evitar dependencia de un
// campo "icon" en JSON. Si añadimos pilares cambiar este mapeo.
const PILLAR_ICONS = [Building2, Sprout];

export function Manifesto() {
  return (
    <section id="manifiesto" className="border-y border-[var(--color-line)] bg-[var(--color-paper-2)] py-24 md:py-28">
      <div className="container-page">
        <div className="max-w-3xl">
          <span className="eyebrow">{m.eyebrow}</span>
          <h2 className="mt-4 font-display text-4xl tracking-tight md:text-5xl">{m.title}</h2>
          <p className="mt-6 text-lg text-[var(--color-mute)]">{m.intro}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {m.pillars.map((p, i) => {
            const Icon = PILLAR_ICONS[i] || Building2;
            return (
              <article
                key={p.label}
                className="flex flex-col gap-6 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 md:p-10"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)]">
                    <Icon size={18} />
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">{p.label}</span>
                </div>

                <h3 className="font-display text-2xl tracking-tight md:text-3xl">{p.title}</h3>
                <p className="text-[var(--color-mute)]">{p.description}</p>

                <ul className="space-y-2.5 text-sm">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5">
                      <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-coral-500)]" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-2">
                  <Link
                    href={p.ctaHref}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-coral-600)]"
                  >
                    {p.ctaLabel}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
