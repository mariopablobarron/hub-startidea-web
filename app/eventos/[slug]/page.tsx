import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Users, Download } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { content } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth/roles";
import { registerForEvent } from "@/lib/events/actions";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/structuredData";

const site = content.site;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

// Detalle de evento BD-driven — runtime SSR
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({ where: { slug } });
  if (!event || !event.published) return {};
  return {
    title: event.title,
    description: event.description.slice(0, 160),
    alternates: { canonical: `${site.url}/eventos/${slug}` },
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 200),
      url: `${site.url}/eventos/${slug}`,
      type: "article",
      images: event.cover ? [{ url: `${site.url}${event.cover}`, width: 1600, height: 1000 }] : undefined,
    },
  };
}

export default async function EventoDetallePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      organizer: { select: { name: true } },
    },
  });
  if (!event || !event.published) notFound();

  const me = await getCurrentUser();
  const room = event.roomSlug ? content.rooms.find((r) => r.slug === event.roomSlug) : null;
  const location = room?.name || event.externalLocation || site.name;
  const registered = event._count.registrations;
  const isFull = !!event.capacity && registered >= event.capacity;
  const isPast = event.startsAt < new Date();

  const fmtDate = event.startsAt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const fmtTime = `${event.startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} – ${event.endsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: location,
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address.street,
        addressLocality: site.address.city,
        postalCode: site.address.postal,
        addressCountry: "ES",
      },
    },
    organizer: { "@type": "Organization", name: site.parent.name, url: site.parent.url },
    image: event.cover ? `${site.url}${event.cover}` : undefined,
    ...(event.capacity ? { maximumAttendeeCapacity: event.capacity } : {}),
  };

  return (
    <>
      <JsonLd
        data={[
          eventSchema,
          breadcrumbSchema([
            { name: "Inicio", url: site.url },
            { name: "Eventos", url: `${site.url}/eventos` },
            { name: event.title, url: `${site.url}/eventos/${event.slug}` },
          ]),
        ]}
      />

      <main className="pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="container-page">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-mute)] hover:text-[var(--color-ink)]"
          >
            <ArrowLeft size={14} /> Todos los eventos
          </Link>

          {event.cover && (
            <div className="relative mt-6 aspect-[2/1] w-full overflow-hidden rounded-3xl bg-[var(--color-paper-2)]">
              <Image src={event.cover} alt="" fill priority sizes="100vw" className="object-cover" />
            </div>
          )}

          <div className="mt-10 grid gap-12 lg:grid-cols-[2fr_1fr]">
            {/* Contenido */}
            <article>
              <h1 className="font-display text-4xl tracking-tight md:text-5xl">{event.title}</h1>

              <div className="mt-6 flex flex-wrap gap-4 text-sm text-[var(--color-mute)]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} className="text-[var(--color-coral-500)]" />
                  <span className="capitalize">{fmtDate}</span> · {fmtTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-[var(--color-coral-500)]" />
                  {location}
                </span>
                {event.capacity && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={14} className="text-[var(--color-coral-500)]" />
                    {registered}/{event.capacity} inscritos
                  </span>
                )}
              </div>

              <div className="prose prose-stone mt-8 max-w-none whitespace-pre-wrap text-[var(--color-ink)]/85">
                {event.description}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={`/eventos/${event.slug}/ics`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
                >
                  <Download size={14} /> Añadir al calendario
                </a>
              </div>
            </article>

            {/* Sidebar: registro */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              {isPast ? (
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-6 text-sm text-[var(--color-mute)]">
                  Este evento ya ha pasado. Revisa{" "}
                  <Link href="/eventos" className="font-medium text-[var(--color-ink)] underline underline-offset-2">
                    los próximos
                  </Link>
                  .
                </div>
              ) : (
                <form
                  action={registerForEvent}
                  className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
                >
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="slug" value={event.slug} />

                  <h2 className="font-display text-xl tracking-tight">
                    {isFull ? "Apuntarme a lista de espera" : "Inscribirme"}
                  </h2>
                  {isFull && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Plazas agotadas. Te avisamos si se libera alguna.
                    </p>
                  )}

                  {sp.saved === "1" && (
                    <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                      ✓ Inscripción recibida. Revisa tu email.
                    </div>
                  )}
                  {sp.error && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                      {sp.error}
                    </div>
                  )}

                  <label className="block text-sm">
                    <span className="font-medium">Nombre</span>
                    <input
                      type="text"
                      name="name"
                      required
                      defaultValue={me?.name || ""}
                      className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Email</span>
                    <input
                      type="email"
                      name="email"
                      required
                      defaultValue={me?.email || ""}
                      className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Teléfono (opcional)</span>
                    <input
                      type="tel"
                      name="phone"
                      className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Notas (opcional)</span>
                    <textarea
                      name="notes"
                      rows={2}
                      className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
                    />
                  </label>
                  <label className="flex items-start gap-2 text-xs text-[var(--color-mute)]">
                    <input type="checkbox" name="consent" required className="mt-0.5" />
                    <span>
                      Acepto la{" "}
                      <Link href="/privacidad" className="underline underline-offset-2">política de privacidad</Link>.
                    </span>
                  </label>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
                  >
                    {isFull ? "Apuntarme a la espera" : "Inscribirme"}
                  </button>
                  <p className="text-xs text-[var(--color-mute)]">
                    Gratis. Te enviamos confirmación al email con el archivo .ics.
                  </p>
                </form>
              )}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
