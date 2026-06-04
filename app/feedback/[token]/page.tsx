import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { content } from "@/lib/content";
import { submitFeedback } from "@/lib/feedback/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu opinión sobre el HUB",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ thanks?: string }>;
};

export default async function FeedbackPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;

  const feedback = await prisma.feedback.findUnique({
    where: { token },
    include: {
      booking: {
        select: { roomSlug: true, startsAt: true },
      },
    },
  });
  if (!feedback) notFound();

  const room = content.rooms.find((r) => r.slug === feedback.booking.roomSlug);
  const fmtDate = feedback.booking.startsAt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Si ya respondió, mostramos pantalla de gracias (idempotente).
  // El flag ?thanks=1 es el redirect del submit; sirve para que un
  // refresh tras enviar muestre el mismo estado sin tocar BD.
  const alreadyResponded = feedback.respondedAt !== null || sp.thanks === "1";

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 md:p-12">
        {alreadyResponded ? (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="mt-6 font-display text-3xl tracking-tight md:text-4xl">
              Gracias por contarnos.
            </h1>
            <p className="mt-3 text-[var(--color-mute)]">
              Lo leemos personalmente. Si abre algo concreto te escribimos directamente.
            </p>
            <a
              href="/"
              className="mt-8 inline-flex items-center rounded-full border border-[var(--color-line)] px-6 py-3 text-sm hover:border-[var(--color-ink)]"
            >
              Volver a la home
            </a>
          </>
        ) : (
          <>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
              HUB Startidea
            </div>
            <h1 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
              ¿Cómo te fue en {room?.name || feedback.booking.roomSlug}?
            </h1>
            <p className="mt-3 text-[var(--color-mute)]">
              {fmtDate}. Cuéntanos en un par de líneas qué tal te sentiste, qué echaste en
              falta o cualquier cosa que quieras. Sin escalas, sin formularios largos.
            </p>

            <form action={submitFeedback} className="mt-8 space-y-4">
              <input type="hidden" name="token" value={token} />
              <label className="block text-sm">
                <span className="font-medium">Tu respuesta</span>
                <textarea
                  name="text"
                  required
                  minLength={5}
                  maxLength={5000}
                  rows={8}
                  autoFocus
                  placeholder="Cuéntanos…"
                  className="mt-2 block w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-base leading-relaxed outline-none focus:border-[var(--color-ink)]"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
                >
                  Enviar
                </button>
                <p className="text-xs text-[var(--color-mute)]">
                  Lo lee Mario y el equipo. Sin tracker, sin auto-replies.
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
