"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { site } from "@/lib/site";

const words = ["Coworking", "formación", "podcast", "comunidad"];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
      {/* Foto de Granada de fondo + mesh gradient encima */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image
          src="/images/hero-granada.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="mesh-blob absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-[var(--color-coral-300)]/40 blur-[120px]" />
        <div
          className="mesh-blob absolute right-[-160px] top-40 h-[480px] w-[480px] rounded-full bg-[var(--color-moss-500)]/30 blur-[120px]"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="mesh-blob absolute bottom-[-120px] left-1/3 h-[420px] w-[420px] rounded-full bg-[var(--color-coral-500)]/25 blur-[120px]"
          style={{ animationDelay: "-12s" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-paper)]/30 via-[var(--color-paper)]/60 to-[var(--color-paper)]" />
      </div>

      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <span className="eyebrow">HUB Startidea · Granada</span>
        </motion.div>

        <h1 className="mt-6 max-w-5xl text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-[88px]">
          <RevealLines>
            <>El espacio donde se cocina la </>
            <em className="font-display italic text-[var(--color-coral-600)]">innovación social</em>
            <> en el centro de Granada.</>
          </RevealLines>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 max-w-2xl text-lg text-[var(--color-mute)] md:text-xl"
        >
          Coworking, salas de formación, estudio de podcast y una comunidad de
          proyectos que cambian las cosas. 330 m² en C/ Conde Cifuentes, 33.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link href="#contacto" className="btn-primary">
            Reserva tu visita
            <ArrowRight size={16} />
          </Link>
          <Link href="#tour" className="btn-ghost">
            Ver el local
            <MapPin size={16} />
          </Link>
        </motion.div>

        {/* Tags rotativos */}
        <div className="mt-16 flex items-center gap-2 text-sm text-[var(--color-mute)]">
          <span className="font-medium uppercase tracking-wider text-[var(--color-ink)]/60">Aquí pasa de todo:</span>
          <RotatingWords items={words} />
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-y-8 border-t border-[var(--color-line)] pt-10 md:grid-cols-4">
          <Stat value="330" suffix="m²" label="Espacio útil" />
          <Stat value="6" label="Aulas multifunción" />
          <Stat value="1" label="Estudio de podcast" />
          <Stat
            value={site.address.city}
            label="Centro · accesible"
            isText
          />
        </div>
      </div>
    </section>
  );
}

function RevealLines({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="block"
    >
      {children}
    </motion.span>
  );
}

function Stat({
  value,
  suffix,
  label,
  isText,
}: {
  value: string | number;
  suffix?: string;
  label: string;
  isText?: boolean;
}) {
  return (
    <div>
      <div className="font-display text-4xl tracking-tight md:text-5xl">
        {value}
        {suffix && <span className="ml-1 text-[var(--color-coral-500)]">{suffix}</span>}
      </div>
      <div className={`mt-2 text-sm ${isText ? "" : ""} text-[var(--color-mute)]`}>{label}</div>
    </div>
  );
}

function RotatingWords({ items }: { items: string[] }) {
  return (
    <span className="relative inline-block h-6 w-40 overflow-hidden align-middle">
      {items.map((word, i) => (
        <motion.span
          key={word}
          className="absolute inset-0 inline-flex items-center font-medium text-[var(--color-ink)]"
          initial={{ y: 24, opacity: 0 }}
          animate={{
            y: [24, 0, 0, -24],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: items.length * 2.2,
            times: [0, 0.05, 0.95 / items.length, 1 / items.length],
            delay: (i * (items.length * 2.2)) / items.length,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
