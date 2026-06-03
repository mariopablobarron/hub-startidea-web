import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Mail, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { content, bankTransfer, bankTransferReady, bookingRef } from "@/lib/content";
import { formatEuros } from "@/lib/bookings/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reserva confirmada",
  description: "Tu reserva está confirmada. Te hemos enviado un email.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ id?: string }>;
};

export default async function ReservarGraciasPage({ searchParams }: Props) {
  const { id } = await searchParams;
  if (!id) redirect("/reservar");

  // Cargar booking + user + sala
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      payment: { select: { amountCents: true, status: true, method: true } },
    },
  });
  if (!booking) redirect("/reservar?error=reserva-no-encontrada");

  const room = content.rooms.find((r) => r.slug === booking.roomSlug);
  const fmtDate = booking.startsAt.toLocaleString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const durationHours =
    (booking.endsAt.getTime() - booking.startsAt.getTime()) / 3_600_000;

  // Si el pago aún no se ha procesado por el webhook, mostramos un
  // estado "Procesando" — refresca en 5s.
  const isConfirmed = booking.status === "CONFIRMED" && booking.payment?.status === "PAID";
  const isTransfer =
    booking.payment?.method === "BANK_TRANSFER" && booking.payment?.status !== "PAID";

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 md:p-12">
        {isTransfer ? (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">
              <Mail size={28} />
            </div>
            <h1 className="mt-6 font-display text-3xl tracking-tight md:text-4xl">
              Reserva recibida — pendiente de pago
            </h1>
            <p className="mt-3 text-[var(--color-mute)]">
              Hemos reservado tu hueco. Para confirmarla, haz la transferencia con estos datos.
              Te hemos enviado una copia a <strong>{booking.user.email}</strong>.
            </p>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              {bankTransferReady() ? (
                <div className="space-y-1">
                  {bankTransfer?.holder && (
                    <div>
                      <span className="text-amber-700">Titular:</span> {bankTransfer.holder}
                    </div>
                  )}
                  <div>
                    <span className="text-amber-700">IBAN:</span>{" "}
                    <span className="font-mono">{bankTransfer?.iban}</span>
                  </div>
                  {bankTransfer?.bankName && (
                    <div>
                      <span className="text-amber-700">Banco:</span> {bankTransfer.bankName}
                    </div>
                  )}
                  {booking.payment && (
                    <div>
                      <span className="text-amber-700">Importe:</span>{" "}
                      {formatEuros(booking.payment.amountCents)}
                    </div>
                  )}
                  <div>
                    <span className="text-amber-700">Concepto:</span>{" "}
                    <span className="font-mono">{bookingRef(booking.id)}</span>
                  </div>
                  {bankTransfer?.instructions && <div className="pt-1">{bankTransfer.instructions}</div>}
                </div>
              ) : (
                <div>
                  Te enviaremos los datos bancarios por email en breve. Indica el concepto{" "}
                  <span className="font-mono">{bookingRef(booking.id)}</span> al hacer la transferencia.
                </div>
              )}
            </div>
          </>
        ) : isConfirmed ? (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="mt-6 font-display text-3xl tracking-tight md:text-4xl">
              ¡Tu reserva está confirmada!
            </h1>
            <p className="mt-3 text-[var(--color-mute)]">
              Hemos enviado los detalles a <strong>{booking.user.email}</strong> junto con un enlace
              para gestionar tu reserva.
            </p>
          </>
        ) : (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-700">
              <Mail size={28} />
            </div>
            <h1 className="mt-6 font-display text-3xl tracking-tight md:text-4xl">
              Procesando tu pago…
            </h1>
            <p className="mt-3 text-[var(--color-mute)]">
              Stripe está confirmando el cobro. En unos segundos verás la reserva confirmada y te
              llegará el email con los detalles.
            </p>
            <noscript>
              <meta httpEquiv="refresh" content="5" />
            </noscript>
          </>
        )}

        <div className="mt-8 grid gap-3 rounded-2xl bg-[var(--color-paper-2)] p-5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-[var(--color-mute)]">Sala</span>
            <span className="font-medium">{room?.name || booking.roomSlug}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[var(--color-mute)]">Fecha</span>
            <span className="font-medium">{fmtDate}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[var(--color-mute)]">Duración</span>
            <span className="font-medium">{durationHours.toFixed(1)}h</span>
          </div>
          {booking.payment && (
            <div className="flex justify-between gap-3 border-t border-[var(--color-line)] pt-3">
              <span className="text-[var(--color-mute)]">
                {booking.payment.status === "PAID" ? "Pagado" : "Importe"}
              </span>
              <span className="font-display text-lg tracking-tight">
                {formatEuros(booking.payment.amountCents)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/login?email=${encodeURIComponent(booking.user.email)}&callbackUrl=${encodeURIComponent("/me/reservas")}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
          >
            Gestionar mi reserva <ArrowRight size={14} />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-6 py-3 text-sm hover:border-[var(--color-ink)]"
          >
            Volver a la home
          </Link>
        </div>

        <p className="mt-6 text-xs text-[var(--color-mute)]">
          ¿No te llega el email en 5 minutos? Revisa la carpeta de spam o escríbenos a{" "}
          <a href="mailto:hola@hubstartidea.es" className="underline">
            hola@hubstartidea.es
          </a>
          .
        </p>
      </div>
    </main>
  );
}
