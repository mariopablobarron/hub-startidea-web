"use client";

import { motion } from "framer-motion";
import { content } from "@/lib/content";
import { getIcon } from "@/lib/icons";

const intro = content.servicesIntro;
const services = content.services;
const amenities = content.amenities;

export function Services() {
  return (
    <section id="ecosistema" className="bg-[var(--color-ink)] py-24 text-[var(--color-paper)] md:py-32">
      <div className="container-page">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <span className="eyebrow text-[var(--color-paper)]/60">{intro.eyebrow}</span>
            <h2 className="mt-4 text-4xl tracking-tight md:text-5xl">
              {intro.title}
            </h2>
            <p className="mt-6 max-w-md text-[var(--color-paper)]/70">
              {intro.description}
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2">
            {services.map((s, i) => {
              const Icon = getIcon(s.icon);
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="bg-[var(--color-ink)] p-8 transition hover:bg-[var(--color-ink-2)]"
                >
                  <Icon size={28} className="text-[var(--color-coral-500)]" />
                  <h3 className="mt-6 font-display text-2xl tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-sm text-[var(--color-paper)]/70">{s.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Marquee amenities */}
        <div className="mt-20 overflow-hidden border-y border-white/10 py-6">
          <div className="marquee-track flex gap-12 whitespace-nowrap">
            {[...amenities, ...amenities, ...amenities].map((a, i) => {
              const Icon = getIcon(a.icon);
              return (
                <span key={i} className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-[var(--color-paper)]/70">
                  <Icon size={16} className="text-[var(--color-coral-500)]" />
                  {a.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
