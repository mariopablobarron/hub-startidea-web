"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mic, Radio, Video, ArrowRight } from "lucide-react";

export function Podcast() {
  return (
    <section id="podcast" className="py-24 md:py-32">
      <div className="container-page">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Visual: ondas + micro */}
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-ink)] via-[var(--color-ink-2)] to-[var(--color-ink)]">
            <Waveform />
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-32 w-32 place-items-center rounded-full bg-[var(--color-coral-500)] text-white shadow-[var(--shadow-glow)]">
                <Mic size={48} />
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--color-paper)]/70">
              <span>● en grabación</span>
              <span>Granada Social</span>
            </div>
          </div>

          {/* Texto */}
          <div>
            <span className="eyebrow">Estudio podcast</span>
            <h2 className="mt-4 text-4xl tracking-tight md:text-5xl">
              Da voz a tu proyecto. <em className="font-display italic text-[var(--color-coral-600)]">Literalmente.</em>
            </h2>
            <p className="mt-6 max-w-xl text-lg text-[var(--color-mute)]">
              Estudio profesional con tratamiento acústico, mesa de mezclas y
              cuatro micros listos para grabar tu podcast, programa de radio o
              entrevista en vídeo. Te ayudamos también con la edición y la
              distribución si lo necesitas.
            </p>

            <ul className="mt-10 space-y-4">
              <Feature icon={<Radio size={16} />} title="Grabación de podcast" desc="Episodios listos para publicar en Spotify, iVoox, Apple Podcasts." />
              <Feature icon={<Video size={16} />} title="Vídeo entrevista" desc="Doble cámara, iluminación de estudio y captura sincronizada." />
              <Feature icon={<Mic size={16} />} title="Voiceover" desc="Cabina insonorizada para locuciones publicitarias y narrativas." />
            </ul>

            <Link href="#contacto" className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-coral-600)] hover:text-[var(--color-coral-700)]">
              Reserva una sesión
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-coral-50)] text-[var(--color-coral-600)]">
        {icon}
      </span>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-[var(--color-mute)]">{desc}</div>
      </div>
    </li>
  );
}

function Waveform() {
  const bars = 32;
  return (
    <svg className="absolute inset-x-0 bottom-1/2 h-1/2 w-full -translate-y-6 opacity-40" viewBox="0 0 320 80" preserveAspectRatio="none">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 10 + Math.sin(i * 0.7) * 22 + Math.random() * 18;
        return (
          <motion.rect
            key={i}
            x={i * (320 / bars) + 4}
            width={(320 / bars) - 8}
            y={(80 - h) / 2}
            height={h}
            rx="2"
            fill="var(--color-coral-500)"
            initial={{ scaleY: 0.3 }}
            animate={{ scaleY: [0.3, 1, 0.5, 0.8, 0.3] }}
            transition={{
              duration: 1.6 + (i % 5) * 0.2,
              repeat: Infinity,
              delay: i * 0.05,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "center" }}
          />
        );
      })}
    </svg>
  );
}
