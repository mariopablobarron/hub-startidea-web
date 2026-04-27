"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Maximize2, Users } from "lucide-react";
import { rooms } from "@/lib/content";

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
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] transition hover:border-[var(--color-ink)] hover:shadow-[var(--shadow-soft)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-paper-2)]">
                  <Image
                    src={room.image}
                    alt={`${room.name} — ${room.subtitle}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  {room.highlight && (
                    <span className="absolute left-4 top-4 rounded-full bg-[var(--color-coral-500)] px-3 py-1 text-xs font-medium text-white shadow-sm">
                      {room.highlight}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-7">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
                      {room.subtitle}
                    </div>
                    <h3 className="mt-2 font-display text-2xl tracking-tight">
                      {room.name}
                    </h3>
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
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
