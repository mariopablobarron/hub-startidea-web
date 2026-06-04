import Link from "next/link";
import { MessageSquareQuote, ExternalLink, Mail } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { content } from "@/lib/content";
import { PageHeader } from "../_components/Field";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ sala?: string; estado?: "respondidos" | "pendientes" | "todos" }>;
};

export default async function AdminFeedbackPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const estado = sp.estado ?? "respondidos";
  const sala = sp.sala;

  // Filtros: por defecto solo respondidos (es la vista útil — los
  // pendientes son metadata, no aportan lectura).
  const [feedbacks, respondidos, pendientes] = await Promise.all([
    prisma.feedback.findMany({
      where: {
        ...(estado === "respondidos" ? { respondedAt: { not: null } } : {}),
        ...(estado === "pendientes" ? { respondedAt: null } : {}),
        ...(sala ? { booking: { roomSlug: sala } } : {}),
      },
      include: {
        booking: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
      },
      orderBy: { respondedAt: "desc" },
      take: 200,
    }),
    prisma.feedback.count({ where: { respondedAt: { not: null } } }),
    prisma.feedback.count({ where: { respondedAt: null } }),
  ]);
  const counts = { respondidos, pendientes };

  // Salas con al menos un feedback (para chips de filtro)
  const roomSlugs = Array.from(new Set(feedbacks.map((f) => f.booking.roomSlug)));
  const roomFilters = roomSlugs
    .map((slug) => content.rooms.find((r) => r.slug === slug))
    .filter(Boolean) as typeof content.rooms;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Respuestas humanas tras una reserva COMPLETED. Una pregunta abierta, sin escalas."
      />

      {/* Métricas y filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 text-sm">
        <Link
          href="/admin/feedback?estado=respondidos"
          className={`rounded-full px-3 py-1.5 ${
            estado === "respondidos"
              ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
              : "border border-[var(--color-line)] text-[var(--color-mute)] hover:border-[var(--color-ink)]"
          }`}
        >
          Respondidos · {counts.respondidos}
        </Link>
        <Link
          href="/admin/feedback?estado=pendientes"
          className={`rounded-full px-3 py-1.5 ${
            estado === "pendientes"
              ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
              : "border border-[var(--color-line)] text-[var(--color-mute)] hover:border-[var(--color-ink)]"
          }`}
        >
          Pendientes · {counts.pendientes}
        </Link>
        <Link
          href="/admin/feedback?estado=todos"
          className={`rounded-full px-3 py-1.5 ${
            estado === "todos"
              ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
              : "border border-[var(--color-line)] text-[var(--color-mute)] hover:border-[var(--color-ink)]"
          }`}
        >
          Todos
        </Link>

        {roomFilters.length > 0 && (
          <>
            <span className="mx-1 text-[var(--color-mute)]">·</span>
            <Link
              href={`/admin/feedback?estado=${estado}`}
              className={`rounded-full px-3 py-1.5 text-xs ${
                !sala
                  ? "bg-[var(--color-paper-2)] text-[var(--color-ink)]"
                  : "text-[var(--color-mute)] hover:text-[var(--color-ink)]"
              }`}
            >
              Todas las salas
            </Link>
            {roomFilters.map((r) => (
              <Link
                key={r.slug}
                href={`/admin/feedback?estado=${estado}&sala=${r.slug}`}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  sala === r.slug
                    ? "bg-[var(--color-paper-2)] text-[var(--color-ink)]"
                    : "text-[var(--color-mute)] hover:text-[var(--color-ink)]"
                }`}
              >
                {r.name}
              </Link>
            ))}
          </>
        )}
      </div>

      {/* Lista */}
      {feedbacks.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-12 text-center">
          <MessageSquareQuote className="mx-auto text-[var(--color-mute)]" size={32} />
          <p className="mt-4 text-[var(--color-mute)]">
            {estado === "respondidos"
              ? "Aún no hay respuestas. El cron envía emails a las 10:00 UTC para reservas COMPLETED con +24h."
              : "Sin feedback para este filtro."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {feedbacks.map((f) => {
            const room = content.rooms.find((r) => r.slug === f.booking.roomSlug);
            const dateLabel = f.booking.startsAt.toLocaleDateString("es-ES", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
            const userName = f.booking.user.name || f.booking.user.email.split("@")[0];

            return (
              <li
                key={f.id}
                className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{userName}</span>
                    <a
                      href={`mailto:${f.booking.user.email}`}
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-mute)] hover:text-[var(--color-ink)]"
                    >
                      <Mail size={12} /> {f.booking.user.email}
                    </a>
                  </div>
                  <div className="text-xs text-[var(--color-mute)]">
                    <span className="text-[var(--color-coral-600)]">{room?.name || f.booking.roomSlug}</span>
                    {" · "}
                    {dateLabel}
                  </div>
                </header>

                {f.respondedAt && f.text ? (
                  <blockquote className="mt-4 whitespace-pre-wrap rounded-xl bg-[var(--color-paper-2)] p-4 text-sm leading-relaxed">
                    {f.text}
                  </blockquote>
                ) : (
                  <p className="mt-4 text-sm italic text-[var(--color-mute)]">
                    Pendiente de respuesta. Email enviado{" "}
                    {f.sentAt.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })}
                    .
                  </p>
                )}

                <footer className="mt-4 flex items-center gap-3 text-xs text-[var(--color-mute)]">
                  {f.respondedAt && (
                    <span>
                      Respondió{" "}
                      {f.respondedAt.toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  <Link
                    href={`/admin/reservas?status=COMPLETED&sala=${f.booking.roomSlug}`}
                    className="inline-flex items-center gap-1 hover:text-[var(--color-ink)]"
                  >
                    Ver reservas de esta sala <ExternalLink size={11} />
                  </Link>
                </footer>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
