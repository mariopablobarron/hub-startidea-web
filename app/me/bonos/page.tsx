import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Ticket, ShoppingCart, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/roles";
import { BOND_CATALOG } from "@/lib/stripe/client";
import { createCheckoutForBond } from "@/lib/stripe/actions";
import { formatEuros } from "@/lib/bookings/pricing";

export const metadata: Metadata = {
  title: "Bonos",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ paid?: string; cancelled?: string; error?: string }> };

const BOND_LABEL = {
  ROOM_HOURS_10: "Bono 10h sala",
  ROOM_HOURS_50: "Bono 50h sala",
  PODCAST_SESSIONS_5: "5 sesiones podcast",
  COWORKING_DAYS_10: "10 días coworking",
} as const;

export default async function MisBonosPage({ searchParams }: Props) {
  const user = await requireAuth("/me/bonos");
  const sp = await searchParams;

  // Bonos activos: con Payment.status=PAID y no caducados
  const myBonds = await prisma.prepaidBond.findMany({
    where: {
      userId: user.id,
      payment: { status: "PAID" },
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    include: { payment: { select: { status: true, amountCents: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-6">
        <Link href="/me" className="inline-flex items-center gap-1 text-sm text-[var(--color-mute)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={14} /> Mi cuenta
        </Link>
      </div>

      <header>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">Mis bonos</h1>
        <p className="mt-2 text-[var(--color-mute)]">
          Compra bonos prepago para usar después en reservas y ahorrar.
        </p>
      </header>

      {sp.paid === "1" && (
        <div role="status" className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 size={16} /> Bono comprado. Ya puedes usarlo en tus reservas.
        </div>
      )}
      {sp.cancelled === "1" && (
        <div role="status" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Compra cancelada. El bono no se ha activado.
        </div>
      )}
      {sp.error && (
        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {sp.error}
        </div>
      )}

      {/* Mis bonos activos */}
      <section className="mt-10">
        <h2 className="font-display text-xl">Activos</h2>
        {myBonds.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-mute)]">
            No tienes bonos activos todavía. Compra uno abajo para empezar a ahorrar.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {myBonds.map((b) => {
              const remaining = b.hoursTotal - b.hoursUsed;
              const pct = (b.hoursUsed / b.hoursTotal) * 100;
              return (
                <li key={b.id} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5">
                  <div className="flex items-center gap-2 text-sm">
                    <Ticket size={14} className="text-[var(--color-coral-500)]" />
                    <span className="font-medium">{BOND_LABEL[b.type]}</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-3xl">{remaining}</span>
                    <span className="text-sm text-[var(--color-mute)]">/ {b.hoursTotal} restantes</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-2)]">
                    <div className="h-full bg-[var(--color-coral-500)]" style={{ width: `${pct}%` }} />
                  </div>
                  {b.expiresAt && (
                    <div className="mt-3 text-xs text-[var(--color-mute)]">
                      Caduca el {new Date(b.expiresAt).toLocaleDateString("es-ES")}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Catálogo de bonos */}
      <section className="mt-12">
        <h2 className="font-display text-xl">Comprar bono</h2>
        <p className="mt-1 text-sm text-[var(--color-mute)]">
          Pago seguro vía Stripe. Activación automática al confirmar el pago.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {BOND_CATALOG.map((b) => (
            <li key={b.type} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
              <h3 className="font-display text-lg tracking-tight">{b.name}</h3>
              <p className="mt-2 text-sm text-[var(--color-mute)]">{b.description}</p>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-display text-3xl">{formatEuros(b.priceCents)}</span>
                <span className="text-xs text-[var(--color-mute)]">
                  ~{formatEuros(b.priceCents / b.hoursTotal)}/h
                </span>
              </div>
              <form action={createCheckoutForBond} className="mt-4">
                <input type="hidden" name="bondType" value={b.type} />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
                >
                  <ShoppingCart size={14} /> Comprar
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
