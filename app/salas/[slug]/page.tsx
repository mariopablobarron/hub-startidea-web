import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Maximize2, Users, MapPin } from "lucide-react";
import { rooms, getRoom } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return rooms.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) return {};
  return {
    title: `${room.name} — ${room.subtitle}`,
    description: room.short,
  };
}

export default async function SalaPage({ params }: Props) {
  const { slug } = await params;
  const room = getRoom(slug);
  if (!room) notFound();

  const others = rooms.filter((r) => r.slug !== room.slug).slice(0, 3);

  return (
    <>
      <article className="container-page pt-32 pb-20 md:pt-40">
        <Link href="/salas" className="inline-flex items-center gap-2 text-sm text-[var(--color-mute)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={14} /> Todas las salas
        </Link>

        <header className="mt-8 grid items-end gap-8 md:grid-cols-[2fr_1fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
              {room.subtitle}
            </div>
            <h1 className="mt-3 text-5xl tracking-tight md:text-7xl">
              {room.name}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--color-mute)]">
              {room.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/#contacto" className="btn-primary">Reservar esta sala</Link>
            <Link href="/#tour" className="btn-ghost">Ver en el plano</Link>
          </div>
        </header>

        <div className="mt-12 relative aspect-[21/9] overflow-hidden rounded-3xl bg-[var(--color-paper-2)]">
          <Image
            src={room.image}
            alt={`${room.name} — ${room.subtitle}`}
            fill
            sizes="(min-width: 1280px) 1280px, 100vw"
            priority
            className="object-cover"
          />
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:grid-cols-4">
          <Spec icon={<Maximize2 size={16} />} label="Superficie" value={`${room.area} m²`} />
          <Spec
            icon={<Users size={16} />}
            label="Aforo escolar"
            value={room.capacity.school > 0 ? `${room.capacity.school} pers.` : "—"}
          />
          <Spec
            icon={<Users size={16} />}
            label="Auditorio"
            value={room.capacity.theater > 0 ? `${room.capacity.theater} pers.` : "—"}
          />
          <Spec icon={<MapPin size={16} />} label="En el plano" value={room.planLabel} />
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-2">
          <Block title="Para qué se usa">
            <ul className="space-y-2 text-[var(--color-ink)]/80">
              {room.uses.map((u) => (
                <li key={u} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-coral-500)]" />
                  {u}
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Equipamiento incluido">
            <ul className="space-y-2 text-[var(--color-ink)]/80">
              {room.equipment.map((e) => (
                <li key={e} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-coral-500)]" />
                  {e}
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </article>

      <section className="bg-[var(--color-paper-2)] py-20">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl tracking-tight md:text-3xl">Otras salas</h2>
            <Link href="/salas" className="text-sm text-[var(--color-coral-600)] hover:text-[var(--color-coral-700)]">
              Ver todas →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {others.map((r) => (
              <Link
                key={r.slug}
                href={`/salas/${r.slug}`}
                className="group overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] transition hover:border-[var(--color-ink)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-paper-2)]">
                  <Image
                    src={r.image}
                    alt={`${r.name} — ${r.subtitle}`}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
                    {r.subtitle}
                  </div>
                  <div className="mt-2 font-display text-xl tracking-tight">{r.name}</div>
                  <div className="mt-3 text-sm text-[var(--color-mute)]">{r.short}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[var(--color-paper)] p-6">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-2xl tracking-tight">{value}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
