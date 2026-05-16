import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth/roles";
import { createTopic } from "@/lib/forum/actions";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/forum/render";

export const metadata: Metadata = {
  title: "Abrir hilo",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NuevoTopicPage({ searchParams }: Props) {
  await requireAuth("/comunidad/nuevo");
  const sp = await searchParams;

  return (
    <main className="pt-32 pb-24 md:pt-40">
      <div className="container-page max-w-2xl">
        <Link href="/comunidad" className="inline-flex items-center gap-1 text-sm text-[var(--color-mute)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={14} /> Comunidad
        </Link>

        <h1 className="mt-6 font-display text-4xl tracking-tight">Abrir un hilo nuevo</h1>
        <p className="mt-3 text-[var(--color-mute)]">
          Anuncia algo, pide ayuda, comparte un proyecto. Lee el hilo antes de
          responder y sé directo.
        </p>

        {sp.error && (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {sp.error}
          </div>
        )}

        <form action={createTopic} className="mt-8 space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
          <label className="block text-sm">
            <span className="font-medium">Categoría</span>
            <select
              name="category"
              required
              defaultValue="GENERAL"
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium">Título</span>
            <input
              type="text"
              name="title"
              required
              minLength={5}
              maxLength={160}
              placeholder="Qué quieres contar — en una frase"
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Contenido</span>
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={20000}
              rows={10}
              placeholder="Desarrolla tu hilo. Saltos de línea bienvenidos."
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
            />
            <p className="mt-1 text-xs text-[var(--color-mute)]">
              Solo texto plano por ahora. Saltos de línea = párrafos.
            </p>
          </label>

          <button
            type="submit"
            className="rounded-full bg-[var(--color-ink)] px-6 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
          >
            Publicar hilo
          </button>
        </form>
      </div>
    </main>
  );
}
