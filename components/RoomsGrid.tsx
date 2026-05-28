"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Maximize2, Users, CalendarCheck } from "lucide-react";
import { rooms, formatArea } from "@/lib/content";

export function RoomsGrid() {
  const featured = rooms.filter((r) => r.category !== "comun").slice(0, 6);

  return (
    <section id="salas" className="py-24 md:py-32">
      <div className="container-page">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">Salas y espacios</span>
            <h2 className="mt-4 max-w-3xl text-4xl tracking-tight md:text-5xl">
              Cada sala tiene nombre porque cada sala tiene historia.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/reservar"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-500)]"
            >
              <CalendarCheck size={14} /> Reservar una sala
            </Link>
            <Link href="/salas" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-coral-600)] hover:text-[var(--color-coral-700)]">
              Ver todas <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((room, i) => (
            <motion.div
              key={room.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              {/*
                Card SIN link entero — dos CTAs al pie ("Ver detalle" y
                "Reservar") evitan la ambigüedad y dan acción clara.
                La imagen + título siguen siendo Link al detalle.
              */}
              <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] transition hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-soft)]">
                <Link href={`/salas/${room.slug}`} className="group relative block aspect-[4/3] w-full overflow-hidden bg-[var(--color-paper-2)]">
                  <Image
                    src={room.image}
                    alt={`${room.name} — ${room.subtitle}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  {room.highlight && (
                    <span className="absolute left-4 top-4 rounded-full bg-[var(--color-coral-700)] px-3 py-1 text-xs font-medium text-white shadow-sm">
                      {room.highlight}
                    </span>
                  )}
                  {room.bookable !== false && (
                    <span className="absolute right-4 top-4 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-[var(--color-ink)] shadow-sm">
                      Reservable
                    </span>
                  )}
                </Link>

                <div className="flex flex-1 flex-col p-7">
                  <Link href={`/salas/${room.slug}`} className="block">
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
                      {room.subtitle}
                    </div>
                    <h3 className="mt-2 font-display text-2xl tracking-tight hover:text-[var(--color-coral-600)]">
                      {room.name}
                    </h3>
                  </Link>

                  <p className="mt-4 text-sm text-[var(--color-mute)]">
                    {room.short}
                  </p>

                  <div className="mt-6 flex items-center gap-5 text-sm text-[var(--color-ink)]/80">
                    <span className="inline-flex items-center gap-1.5">
                      <Maximize2 size={14} className="text-[var(--color-coral-500)]" />
                      {formatArea(room.area)} m²
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={14} className="text-[var(--color-coral-500)]" />
                      hasta {Math.max(room.capacity.school, room.capacity.theater, room.capacity.coctel ?? 0, room.capacity.boardroom ?? 0)}
                    </span>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
                    {room.bookable !== false && (
                      <Link
                        href={`/reservar?sala=${room.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 py-2 text-xs font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-500)]"
                      >
                        <CalendarCheck size={12} /> Reservar
                      </Link>
                    )}
                    <Link
                      href={`/salas/${room.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-4 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:border-[var(--color-ink)]"
                    >
                      Ver detalle <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
