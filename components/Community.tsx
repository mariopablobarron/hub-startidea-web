import { ArrowRight } from "lucide-react";
import { content } from "@/lib/content";
import { getIcon } from "@/lib/icons";

const community = content.community;

export function Community() {
  return (
    <section id="comunidad-intro" className="py-24 md:py-32">
      <div className="container-page">
        <div className="max-w-3xl">
          <span className="eyebrow">{community.eyebrow}</span>
          <h2 className="mt-4 text-4xl tracking-tight md:text-5xl">
            {community.titleStart}<em className="font-display italic text-[var(--color-coral-600)]">{community.titleEm}</em>
          </h2>
          <p className="mt-6 text-lg text-[var(--color-mute)]">
            {community.description}
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl bg-[var(--color-line)] sm:grid-cols-3">
          {community.pillars.map((p) => {
            const Icon = getIcon(p.icon);
            return (
              <div key={p.title} className="bg-[var(--color-paper)] p-8">
                <Icon size={28} className="text-[var(--color-coral-500)]" />
                <h3 className="mt-6 font-display text-2xl tracking-tight">{p.title}</h3>
                <p className="mt-3 text-sm text-[var(--color-mute)]">{p.text}</p>
              </div>
            );
          })}
        </div>

        {/* CTA a la comunidad online (consolidada en el Telar) */}
        <div className="mt-10">
          <a
            href="https://comunidad.hubstartidea.es"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-500)]"
          >
            Entrar a la comunidad <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
