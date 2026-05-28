import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Maximize2, Users } from "lucide-react";
import { rooms, content, formatArea } from "@/lib/content";
import { JsonLd } from "@/components/JsonLd";
import { roomsItemListSchema, breadcrumbSchema } from "@/lib/seo/structuredData";

const site = content.site;

export const metadata: Metadata = {
  title: "Salas y espacios",
  description:
    "Descubre las salas del HUB Startidea: aulas multifunción, sala de reuniones Serendipia, estudio de podcast, coworking abierto y office privado.",
  alternates: { canonical: `${site.url}/salas` },
  openGraph: {
    title: `Salas y espacios · ${site.name}`,
    description: "Aulas multifunción, sala de reuniones, estudio de podcast, coworking y office privado.",
    url: `${site.url}/salas`,
    images: [{ url: `${site.url}/images/og/og-default.jpg`, width: 1200, height: 630 }],
  },
};

export default function SalasPage() {
  return (
    <>
      <JsonLd
        data={[
          roomsItemListSchema(),
          breadcrumbSchema([
            { name: "Inicio", url: site.url },
            { name: "Salas", url: `${site.url}/salas` },
          ]),
        ]}
      />
      <header className="container-page pt-32 md:pt-40">
        <span className="eyebrow">Catálogo de espacios</span>
        <h1 className="mt-4 max-w-4xl text-5xl tracking-tight md:text-6xl">
          Todas las salas del HUB Startidea.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--color-mute)]">
          Cada espacio está pensado para algo concreto: formación, reunión,
          grabación o trabajo individual. Toca cualquiera para ver capacidad,
          equipamiento y para qué se usa habitualmente.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/reservar"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-500)]"
          >
            Reservar una sala por horas
          </Link>
          <Link
            href="/#contacto"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-medium hover:border-[var(--color-ink)]"
          >
            Otras consultas
          </Link>
        </div>
      </header>

      <div className="container-page mt-16 mb-32 grid gap-4 md:grid-cols-2">
        {rooms.map((room) => (
          <Link
            key={room.slug}
            href={`/salas/${room.slug}`}
            className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] transition hover:border-[var(--color-ink)]"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-paper-2)]">
              <Image
                src={room.image}
                alt={`${room.name} — ${room.subtitle}`}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
              {room.highlight && (
                <span className="absolute left-5 top-5 rounded-full bg-[var(--color-coral-700)] px-3 py-1 text-xs font-medium text-white shadow-sm">
                  {room.highlight}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-6 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
                  {room.subtitle}
                </div>
                <h2 className="mt-2 font-display text-3xl tracking-tight">
                  {room.name}
                </h2>
              </div>
            </div>

            <p className="text-[var(--color-mute)]">{room.short}</p>

            <div className="flex items-center gap-6 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Maximize2 size={14} className="text-[var(--color-coral-500)]" />
                {formatArea(room.area)} m²
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={14} className="text-[var(--color-coral-500)]" />
                hasta {Math.max(room.capacity.school, room.capacity.theater, room.capacity.coctel ?? 0, room.capacity.boardroom ?? 0)} pers.
              </span>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-[var(--color-line)] pt-5">
              <span className="text-sm text-[var(--color-mute)]">
                {room.uses.slice(0, 3).join(" · ")}
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line)] transition group-hover:border-[var(--color-ink)] group-hover:bg-[var(--color-ink)] group-hover:text-[var(--color-paper)]">
                <ArrowRight size={14} />
              </span>
            </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
