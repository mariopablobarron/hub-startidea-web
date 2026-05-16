import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { PageHeader, FlashBanner } from "../_components/Field";
import { CATEGORY_LABEL, CATEGORY_COLOR, timeAgo } from "@/lib/forum/render";
import { toggleTopicPinned, toggleTopicLocked, deleteTopic } from "@/lib/forum/actions";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export const dynamic = "force-dynamic";

export default async function AdminForoPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  const topics = await prisma.topic.findMany({
    orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
    take: 100,
    include: {
      author: { select: { name: true, email: true } },
      _count: { select: { posts: true, reactions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Foro"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Moderar hilos de la comunidad — fijar, cerrar, eliminar."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-line)] bg-[var(--color-paper-2)]">
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">
              <th className="px-4 py-3 font-medium">Hilo</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Autor</th>
              <th className="px-4 py-3 font-medium">Actividad</th>
              <th className="px-4 py-3 font-medium">Posts</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {topics.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--color-mute)]">Sin hilos.</td></tr>
            )}
            {topics.map((t) => (
              <tr key={t.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper-2)]/40">
                <td className="px-4 py-3">
                  <Link href={`/comunidad/${t.slug}`} target="_blank" className="font-medium hover:text-[var(--color-coral-600)]">
                    {t.pinned && "📌 "}
                    {t.locked && "🔒 "}
                    {t.title}
                    <ExternalLink size={10} className="ml-1 inline" />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLOR[t.category]}`}>
                    {CATEGORY_LABEL[t.category]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{t.author.name || "—"}</div>
                  <div className="text-xs text-[var(--color-mute)]">{t.author.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-mute)]">{timeAgo(t.lastActivityAt)}</td>
                <td className="px-4 py-3 text-sm">{t._count.posts}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <ModForm action={toggleTopicPinned} slug={t.slug} label={t.pinned ? "Desfijar" : "Fijar"} />
                    <ModForm action={toggleTopicLocked} slug={t.slug} label={t.locked ? "Reabrir" : "Cerrar"} />
                    <ModForm action={deleteTopic} slug={t.slug} label="Borrar" danger />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModForm({
  action,
  slug,
  label,
  danger,
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
        className={`rounded-full border px-3 py-1 text-xs ${
          danger
            ? "border-red-200 text-red-700 hover:bg-red-50"
            : "border-[var(--color-line)] hover:border-[var(--color-ink)]"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
