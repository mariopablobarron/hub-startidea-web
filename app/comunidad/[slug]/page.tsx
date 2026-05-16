import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin, Lock, MessageCircle, Heart, PartyPopper, Lightbulb, Hand, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/roles";
import { content } from "@/lib/content";
import {
  CATEGORY_LABEL,
  CATEGORY_COLOR,
  timeAgo,
} from "@/lib/forum/render";
import {
  createPost,
  toggleReaction,
  toggleTopicPinned,
  toggleTopicLocked,
  deleteTopic,
} from "@/lib/forum/actions";
import type { ReactionType } from "@prisma/client";

const site = content.site;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = await prisma.topic.findUnique({ where: { slug } });
  if (!topic) return {};
  return {
    title: topic.title,
    description: topic.body.slice(0, 160),
    alternates: { canonical: `${site.url}/comunidad/${slug}` },
    openGraph: {
      title: topic.title,
      description: topic.body.slice(0, 200),
      url: `${site.url}/comunidad/${slug}`,
      type: "article",
    },
  };
}

const REACTION_ICONS: Record<ReactionType, React.ReactNode> = {
  LIKE: <Heart size={12} />,
  CELEBRATE: <PartyPopper size={12} />,
  IDEA: <Lightbulb size={12} />,
  THANK: <Hand size={12} />,
};
const REACTION_LABELS: Record<ReactionType, string> = {
  LIKE: "Me gusta",
  CELEBRATE: "Celebrar",
  IDEA: "Idea",
  THANK: "Gracias",
};

export default async function TopicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const me = await getCurrentUser();

  // Incrementar views (fire-and-forget)
  const existing = await prisma.topic.findUnique({ where: { slug } });
  if (!existing) notFound();
  prisma.topic.update({ where: { id: existing.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const topic = await prisma.topic.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, email: true } },
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, email: true } },
          reactions: { select: { type: true, userId: true } },
        },
      },
      reactions: { select: { type: true, userId: true } },
    },
  });
  if (!topic) notFound();

  // Agrupar reacciones del topic por tipo
  const topicReactions = groupReactions(topic.reactions);

  const isAdmin = me?.role === "ADMIN";
  const canReply = !!me && (!topic.locked || isAdmin);

  return (
    <main className="pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="container-page max-w-3xl">
        <Link href="/comunidad" className="inline-flex items-center gap-1 text-sm text-[var(--color-mute)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={14} /> Comunidad
        </Link>

        {/* Header */}
        <article className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOR[topic.category]}`}>
              {CATEGORY_LABEL[topic.category]}
            </span>
            {topic.pinned && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-coral-600)]">
                <Pin size={12} /> Fijado
              </span>
            )}
            {topic.locked && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--color-mute)]">
                <Lock size={12} /> Cerrado
              </span>
            )}
          </div>
          <h1 className="mt-4 font-display text-4xl tracking-tight md:text-5xl">{topic.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-mute)]">
            <span>{topic.author.name || topic.author.email}</span>
            <span>·</span>
            <span>{timeAgo(topic.createdAt)}</span>
            <span>·</span>
            <span>{topic.views + 1} vistas</span>
          </div>

          <div className="prose prose-stone mt-8 max-w-none whitespace-pre-wrap text-[var(--color-ink)]/85">
            {topic.body}
          </div>

          {/* Reacciones al topic */}
          <ReactionBar
            reactions={topicReactions}
            currentUserId={me?.id}
            target={{ topicId: topic.id }}
            topicSlug={topic.slug}
            disabled={!me}
          />

          {/* Moderación admin */}
          {isAdmin && (
            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-3 text-xs">
              <span className="font-medium text-[var(--color-mute)]">Moderación:</span>
              <ModerationButton action={toggleTopicPinned} slug={topic.slug} label={topic.pinned ? "Desfijar" : "Fijar"} />
              <ModerationButton action={toggleTopicLocked} slug={topic.slug} label={topic.locked ? "Reabrir" : "Cerrar"} />
              <ModerationButton action={deleteTopic} slug={topic.slug} label="Eliminar" danger />
            </div>
          )}
        </article>

        {/* Respuestas */}
        <section className="mt-12">
          <h2 className="flex items-center gap-2 font-display text-xl tracking-tight">
            <MessageCircle size={18} className="text-[var(--color-coral-500)]" />
            {topic.posts.length} respuesta{topic.posts.length === 1 ? "" : "s"}
          </h2>

          <ul className="mt-6 space-y-4">
            {topic.posts.map((p) => {
              const postReactions = groupReactions(p.reactions);
              return (
                <li key={p.id} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-mute)]">
                    <span className="font-medium text-[var(--color-ink)]">{p.author.name || p.author.email}</span>
                    <span>·</span>
                    <span>{timeAgo(p.createdAt)}</span>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-ink)]/85">{p.body}</div>
                  <ReactionBar
                    reactions={postReactions}
                    currentUserId={me?.id}
                    target={{ postId: p.id }}
                    topicSlug={topic.slug}
                    disabled={!me}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {/* Form responder */}
        {canReply ? (
          <form action={createPost} className="mt-10 space-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
            <input type="hidden" name="topicSlug" value={topic.slug} />
            <h3 className="font-display text-lg">Responder</h3>
            {sp.saved === "1" && (
              <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                ✓ Respuesta publicada.
              </div>
            )}
            {sp.error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                {sp.error}
              </div>
            )}
            <textarea
              name="body"
              required
              minLength={2}
              maxLength={20000}
              rows={4}
              placeholder="Escribe tu respuesta..."
              className="block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-ink)]"
            />
            <button
              type="submit"
              className="rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
            >
              Publicar respuesta
            </button>
          </form>
        ) : !me ? (
          <div className="mt-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-6 text-sm">
            <Link href={`/login?callbackUrl=/comunidad/${topic.slug}`} className="font-medium underline underline-offset-2 hover:text-[var(--color-coral-600)]">
              Entra a tu cuenta
            </Link>{" "}
            para responder.
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-6 text-sm text-[var(--color-mute)]">
            Este hilo está cerrado.
          </div>
        )}
      </div>
    </main>
  );
}

type ReactionGroup = Partial<Record<ReactionType, { count: number; mine: boolean }>>;

function groupReactions(rs: Array<{ type: ReactionType; userId: string }>): ReactionGroup {
  const g: ReactionGroup = {};
  for (const r of rs) {
    if (!g[r.type]) g[r.type] = { count: 0, mine: false };
    g[r.type]!.count += 1;
  }
  return g;
}

function ReactionBar({
  reactions,
  currentUserId,
  target,
  topicSlug,
  disabled,
}: {
  reactions: ReactionGroup;
  currentUserId: string | undefined;
  target: { topicId?: string; postId?: string };
  topicSlug: string;
  disabled: boolean;
}) {
  const types: ReactionType[] = ["LIKE", "CELEBRATE", "IDEA", "THANK"];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      {types.map((t) => {
        const r = reactions[t];
        const count = r?.count || 0;
        return (
          <form key={t} action={toggleReaction} className="inline">
            {target.topicId && <input type="hidden" name="topicId" value={target.topicId} />}
            {target.postId && <input type="hidden" name="postId" value={target.postId} />}
            <input type="hidden" name="type" value={t} />
            <input type="hidden" name="topicSlug" value={topicSlug} />
            <button
              type="submit"
              disabled={disabled}
              title={REACTION_LABELS[t]}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
                count > 0
                  ? "border-[var(--color-coral-500)]/40 bg-[var(--color-coral-100)] text-[var(--color-coral-700)]"
                  : "border-[var(--color-line)] text-[var(--color-mute)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {REACTION_ICONS[t]}
              {count > 0 && <span>{count}</span>}
            </button>
          </form>
        );
      })}
    </div>
  );
}

function ModerationButton({
  action,
  slug,
  label,
  danger = false,
}: {
  action: (fd: FormData) => void | Promise<void>;
  slug: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
          danger
            ? "border-red-200 text-red-700 hover:bg-red-50"
            : "border-[var(--color-line)] hover:border-[var(--color-ink)]"
        }`}
      >
        {danger && <Trash2 size={10} />} {label}
      </button>
    </form>
  );
}
