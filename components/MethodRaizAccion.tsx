import { ArrowUpRight } from "lucide-react";
import { content } from "@/lib/content";

const r = content.methodRaizAccion;

export function MethodRaizAccion() {
  return (
    <section
      id="metodo"
      className="relative isolate overflow-hidden bg-gradient-to-br from-[#3a2a1c] via-[#4a3a2a] to-[#2a1f15] py-24 text-[var(--color-paper)] md:py-32"
    >
      {/* Mesh gradient sutil */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-10 h-[420px] w-[420px] rounded-full bg-[#c98d5b]/20 blur-[120px]" />
        <div className="absolute right-[-100px] bottom-0 h-[360px] w-[360px] rounded-full bg-[var(--color-coral-500)]/15 blur-[120px]" />
      </div>

      <div className="container-page relative">
        <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-paper)]/60">
              {r.eyebrow}
            </span>
            <div className="mt-3 font-display text-sm tracking-[0.3em] text-[#c98d5b]">
              {r.label.toUpperCase()}
            </div>
            <h2 className="mt-4 font-display text-4xl tracking-tight md:text-5xl">{r.title}</h2>
            <p className="mt-6 max-w-md text-[var(--color-paper)]/75">{r.description}</p>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-paper)] px-6 py-3 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-coral-500)] hover:text-[var(--color-paper)]"
            >
              {r.ctaLabel}
              <ArrowUpRight size={14} />
            </a>
          </div>

          {/* Pasos del método como columnas con número */}
          <ol className="grid gap-3 sm:grid-cols-2">
            {r.steps.map((s) => (
              <li
                key={s.step}
                className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-5xl tracking-tight text-[#c98d5b]">{s.step}</span>
                  <span className="font-display text-xl tracking-tight">{s.title}</span>
                </div>
                <p className="mt-3 text-sm text-[var(--color-paper)]/70">{s.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
