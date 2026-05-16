import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Pin, Lock, Plus } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/roles";
import { content } from "@/lib/content";
import { CATEGORY_LABEL, CATEGORY_COLOR, CATEGORIES, excerpt, timeAgo } from "@/lib/forum/render";
import type { TopicCategory } from "@prisma/client";

export const metadata: Metadata = {
  title: "Comunidad — foro del HUB Startidea",
  description: "Anuncios, proyectos, dudas y conversaciones de la comunidad del HUB Startidea.",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ cat?: string }> };

export default async function ComunidadPage({ searchParams }: Props) {
  const sp = await searchParams;
  const cat = CATEGORIES.includes(sp.cat as TopicCategory) ? (sp.cat as TopicCategory) : undefined;
  const me = await getCurrentUser();

  // Counts por categoría
  const counts = await prisma.topic.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  const countByCategory: Record<string, number> = {};
  let total = 0;
  for (const c of counts) {
    countByCategory[c.category] = c._count._all;
    total += c._count._all;
  }

  const topics = await prisma.topic.findMany({
    where: cat ? { category: cat } : undefined,
    orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
    take: 50,
    include: {
      author: { select: { name: true, email: true } },
      _count: { select: { posts: true, reactions: true } },
    },
  });

  return (
    <main className="pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="container-page">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Comunidad</span>
            <h1 className="mt-4 font-display text-5xl tracking-tight md:text-6xl">
              Lo que se habla en el HUB.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[var(--color-mute)]">
              Anuncios, proyectos buscando ayuda, dudas técnicas, organización de eventos.
              Si tienes cuenta en el HUB, puedes participar.
            </p>
          </div>
          {me ? (
            <Link
              href="/comunidad/nuevo"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
            >
              <Plus size={14} /> Abrir hilo
            </Link>
          ) : (
            <Link
              href="/login?callbackUrl=/comunidad"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-5 py-2.5 text-sm font-medium hover:border-[var(--color-ink)]"
            >
              Entrar para participar
            </Link>
          )}
        </header>

        {/* Filtros categoría */}
        <div className="mt-10 flex flex-wrap gap-1.5">
          <CategoryChip href="/comunidad" active={!cat} label="Todas" count={total} />
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c}
              href={`/comunidad?cat=${c}`}
              active={cat === c}
              label={CATEGORY_LABEL[c]}
              count={countByCategory[c] || 0}
            />
          ))}
        </div>

        {/* Lista de topics */}
        <ul className="mt-8 space-y-3">
          {topics.length === 0 && (
            <li className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 text-center text-[var(--color-mute)]">
              {cat ? "Sin hilos en esta categoría todavía." : "Sin hilos todavía. Sé el primero."}
            </li>
          )}
          {topics.map((t) => (
            <li key={t.id}>
              <Link
                href={`/comunidad/${t.slug}`}
                className="group block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 transition hover:border-[var(--color-ink)] hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOR[t.category]}`}>
                        {CATEGORY_LABEL[t.category]}
                      </span>
                      {t.pinned && (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-coral-600)]">
                          <Pin size={10} /> Fijado
                        </span>
                      )}
                      {t.locked && (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-mute)]">
                          <Lock size={10} /> Cerrado
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-display text-xl tracking-tight transition group-hover:text-[var(--color-coral-600)]">
                      {t.title}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-mute)]">{excerpt(t.body, 180)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-mute)]">
                      <span>{t.author.name || t.author.email}</span>
                      <span>·</span>
                      <span>{timeAgo(t.lastActivityAt)}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle size={10} /> {t._count.posts}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function CategoryChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${
        active
          ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border border-[var(--color-line)] text-[var(--color-mute)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 ${active ? "bg-white/15" : "bg-[var(--color-paper-2)]"}`}>{count}</span>
    </Link>
  );
}
