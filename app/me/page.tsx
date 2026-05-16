import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Ticket, MessageCircle, Settings } from "lucide-react";
import { requireAuth, ROLE_LABEL } from "@/lib/auth/roles";
import { signOut } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

export default async function MePage() {
  const user = await requireAuth("/me");

  // Datos resumen — bajo en queries, expandible más adelante
  const [upcomingBookings, activeBonds, recentTopics] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id, startsAt: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.prepaidBond.findMany({
      where: {
        userId: user.id,
        payment: { status: "PAID" },
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.topic.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">
            Hola, {user.name || user.email.split("@")[0]}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-mute)]">
            {user.email} · <span className="inline-flex rounded-full bg-[var(--color-paper-2)] px-2 py-0.5 text-xs">{ROLE_LABEL[user.role]}</span>
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm hover:border-[var(--color-ink)]"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Card icon={<Calendar size={18} />} title="Próximas reservas" count={upcomingBookings.length}>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-[var(--color-mute)]">
              Sin reservas próximas.{" "}
              <Link href="/reservar" className="font-medium underline underline-offset-2 hover:text-[var(--color-coral-600)]">
                Reservar una sala
              </Link>
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcomingBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2">
                  <span className="font-medium">{b.roomSlug}</span>
                  <span className="text-[var(--color-mute)]">
                    {new Date(b.startsAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card icon={<Ticket size={18} />} title="Bonos activos" count={activeBonds.length}>
          {activeBonds.length === 0 ? (
            <p className="text-sm text-[var(--color-mute)]">
              Sin bonos comprados.{" "}
              <Link href="/me/bonos" className="font-medium underline underline-offset-2 hover:text-[var(--color-coral-600)]">
                Comprar bono
              </Link>
            </p>
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {activeBonds.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2">
                    <span>{b.type.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="text-[var(--color-mute)]">
                      {b.hoursTotal - b.hoursUsed} restantes
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/me/bonos" className="mt-3 inline-block text-sm font-medium text-[var(--color-coral-600)] hover:underline">
                Ver todos →
              </Link>
            </>
          )}
        </Card>

        <Card icon={<MessageCircle size={18} />} title="Mis hilos" count={recentTopics.length}>
          {recentTopics.length === 0 ? (
            <p className="text-sm text-[var(--color-mute)]">
              No has publicado todavía.{" "}
              <Link href="/comunidad" className="font-medium underline underline-offset-2 hover:text-[var(--color-coral-600)]">
                Ver comunidad
              </Link>
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentTopics.map((t) => (
                <li key={t.id}>
                  <Link href={`/comunidad/${t.slug}`} className="font-medium hover:text-[var(--color-coral-600)]">
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card icon={<Settings size={18} />} title="Tu cuenta">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/me/perfil" className="hover:text-[var(--color-coral-600)]">Editar perfil</Link>
            </li>
            <li>
              <Link href="/me/reservas" className="hover:text-[var(--color-coral-600)]">Historial de reservas</Link>
            </li>
            {user.role === "ADMIN" && (
              <li>
                <Link href="/admin" className="font-medium text-[var(--color-coral-600)] hover:underline">
                  Ir al panel admin →
                </Link>
              </li>
            )}
          </ul>
        </Card>
      </div>
    </main>
  );
}

function Card({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--color-coral-500)]">{icon}</span>
        <span className="font-display tracking-tight">{title}</span>
        {typeof count === "number" && count > 0 && (
          <span className="ml-auto rounded-full bg-[var(--color-paper-2)] px-2 py-0.5 text-xs text-[var(--color-mute)]">
            {count}
          </span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
