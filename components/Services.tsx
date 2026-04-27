"use client";

import { motion } from "framer-motion";
import { services, amenities } from "@/lib/data/services";

export function Services() {
  return (
    <section id="formacion" className="bg-[var(--color-ink)] py-24 text-[var(--color-paper)] md:py-32">
      <div className="container-page">
        <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <span className="eyebrow text-[var(--color-paper)]/60">Lo que ofrecemos</span>
            <h2 className="mt-4 text-4xl tracking-tight md:text-5xl">
              Cuatro maneras de usar el HUB.
            </h2>
            <p className="mt-6 max-w-md text-[var(--color-paper)]/70">
              Aquí caben las personas que vienen a trabajar, los equipos que se
              reúnen, las formaciones que cambian carreras, los podcast que
              cuentan lo que nadie cuenta y los eventos que generan red.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-[var(--color-ink)] p-8 transition hover:bg-[var(--color-ink-2)]"
              >
                <s.icon size={28} className="text-[var(--color-coral-500)]" />
                <h3 className="mt-6 font-display text-2xl tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm text-[var(--color-paper)]/70">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Marquee amenities */}
        <div className="mt-20 overflow-hidden border-y border-white/10 py-6">
          <div className="marquee-track flex gap-12 whitespace-nowrap">
            {[...amenities, ...amenities, ...amenities].map((a, i) => (
              <span key={i} className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-[var(--color-paper)]/70">
                <a.icon size={16} className="text-[var(--color-coral-500)]" />
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
