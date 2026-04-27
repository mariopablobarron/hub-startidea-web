"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Maximize2, Users } from "lucide-react";
import { rooms } from "@/lib/data/rooms";

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
          <Link href="/salas" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-coral-600)] hover:text-[var(--color-coral-700)]">
            Ver todas las salas <ArrowUpRight size={14} />
          </Link>
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
              <Link
                href={`/salas/${room.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-7 transition hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
                      {room.subtitle}
                    </div>
                    <h3 className="mt-2 font-display text-2xl tracking-tight">
                      {room.name}
                    </h3>
                  </div>
                  {room.highlight && (
                    <span className="rounded-full bg-[var(--color-coral-50)] px-3 py-1 text-xs font-medium text-[var(--color-coral-700)]">
                      {room.highlight}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm text-[var(--color-mute)]">
                  {room.short}
                </p>

                <div className="mt-6 flex items-center gap-5 text-sm text-[var(--color-ink)]/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Maximize2 size={14} className="text-[var(--color-coral-500)]" />
                    {room.area} m²
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={14} className="text-[var(--color-coral-500)]" />
                    hasta {Math.max(room.capacity.school, room.capacity.theater, room.capacity.coctel ?? 0, room.capacity.boardroom ?? 0)}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between pt-8">
                  <span className="text-xs text-[var(--color-mute)]">
                    {room.uses.slice(0, 2).join(" · ")}
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] transition group-hover:border-[var(--color-ink)] group-hover:bg-[var(--color-ink)] group-hover:text-[var(--color-paper)]">
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
