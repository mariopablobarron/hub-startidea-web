import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { content } from "@/lib/content";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/structuredData";

const site = content.site;

export const metadata: Metadata = {
  title: "Eventos — agenda del HUB Startidea",
  description: "Talleres, presentaciones, podcasts en vivo y encuentros del universo Startidea en el centro de Granada.",
  alternates: { canonical: `${site.url}/eventos` },
  openGraph: {
    title: "Eventos del HUB Startidea",
    description: "Agenda viva del universo Startidea: formación, podcasts, comunidad.",
    url: `${site.url}/eventos`,
    type: "website",
  },
};

// Lista de eventos BD-driven — runtime SSR, no prerender estático
export const dynamic = "force-dynamic";
export const revalidate = 60;

export default async function EventosPage() {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { published: true, isPublic: true, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } },
    }),
    prisma.event.findMany({
      where: { published: true, isPublic: true, startsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 8,
    }),
  ]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: upcoming.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        "@id": `${site.url}/eventos/${e.slug}`,
        name: e.title,
        startDate: e.startsAt.toISOString(),
        endDate: e.endsAt.toISOString(),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: site.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: site.address.street,
            addressLocality: site.address.city,
            postalCode: site.address.postal,
            addressCountry: "ES",
          },
        },
        organizer: {
          "@type": "Organization",
          name: site.parent.name,
          url: site.parent.url,
        },
      },
    })),
  };

  return (
    <>
      <JsonLd
        data={[
          itemListSchema,
          breadcrumbSchema([
            { name: "Inicio", url: site.url },
            { name: "Eventos", url: `${site.url}/eventos` },
          ]),
        ]}
      />

      <main className="pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="container-page">
          <header className="max-w-2xl">
            <span className="eyebrow">Agenda</span>
            <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">
              Lo que pasa en el HUB.
            </h1>
            <p className="mt-6 text-lg text-[var(--color-mute)]">
              Talleres, podcasts en vivo, encuentros del ecosistema. Abierto a todo
              el mundo salvo cuando se indica lo contrario.
            </p>
          </header>

          {/* Próximos */}
          <section className="mt-16">
            <h2 className="font-display text-2xl tracking-tight">Próximamente</h2>
            {upcoming.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8">
                <p className="text-[var(--color-mute)]">
                  Sin eventos publicados ahora mismo. Estamos cocinando los próximos.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={site.social.instagram}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
                  >
                    Síguenos en Instagram
                  </Link>
                  <Link
                    href="/salas"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
                  >
                    Conoce las salas
                  </Link>
                  <Link
                    href="/#contacto"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
                  >
                    Escríbenos para co-organizar
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} registered={e._count.registrations} />
                ))}
              </ul>
            )}
          </section>

          {/* Pasados */}
          {past.length > 0 && (
            <section className="mt-20">
              <h2 className="font-display text-2xl tracking-tight text-[var(--color-mute)]">Recientes</h2>
              <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {past.map((e) => (
                  <li key={e.id} className="opacity-65">
                    <EventCard event={e} compact />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function EventCard({
  event,
  registered,
  compact = false,
}: {
  event: {
    slug: string;
    title: string;
    description: string;
    startsAt: Date;
    cover: string | null;
    capacity: number | null;
    roomSlug: string | null;
    externalLocation: string | null;
  };
  registered?: number;
  compact?: boolean;
}) {
  const room = event.roomSlug ? content.rooms.find((r) => r.slug === event.roomSlug) : null;
  const location = room?.name || event.externalLocation || "HUB Startidea";
  const fmt = event.startsAt.toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={`/eventos/${event.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] transition hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-sm"
    >
      {event.cover ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-paper-2)]">
          <Image src={event.cover} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw" className="object-cover" />
        </div>
      ) : (
        <div className="aspect-[16/10] w-full bg-gradient-to-br from-[var(--color-paper-2)] to-[var(--color-coral-100)]" aria-hidden />
      )}
      <div className={`flex flex-1 flex-col gap-2 p-${compact ? "4" : "5"}`}>
        <div className="flex items-center gap-2 text-xs text-[var(--color-mute)]">
          <Calendar size={12} /> {fmt}
        </div>
        <h3 className="font-display text-lg tracking-tight">{event.title}</h3>
        <p className="line-clamp-2 text-sm text-[var(--color-mute)]">{event.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-[var(--color-mute)]">
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} /> {location}
          </span>
          {typeof registered === "number" && event.capacity && (
            <span>
              {registered}/{event.capacity}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
