import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { bookableRooms } from "@/lib/content";
import { formatEuros } from "@/lib/bookings/pricing";
import { PageHeader, FlashBanner } from "../_components/Field";
import { createCoupon, toggleCoupon, deleteCoupon } from "@/lib/admin/couponActions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminCuponesPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cupones"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Códigos de descuento que el cliente introduce al reservar. Pueden ser % o importe fijo (€)."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {/* Crear cupón */}
      <form
        action={createCoupon}
        className="grid gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:grid-cols-2"
      >
        <h2 className="font-display text-lg sm:col-span-2">Nuevo cupón</h2>
        <label className="block text-sm">
          <span className="font-medium">Código</span>
          <input
            name="code"
            required
            maxLength={40}
            placeholder="AMIGO20"
            className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 uppercase focus:border-[var(--color-ink)] focus:outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="font-medium">Tipo</span>
            <select
              name="kind"
              className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2"
            >
              <option value="PERCENT">% porcentaje</option>
              <option value="FIXED">€ importe fijo</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Valor</span>
            <input
              name="value"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="20"
              className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 focus:border-[var(--color-ink)] focus:outline-none"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-medium">Caduca (opcional)</span>
          <input
            name="expiresAtISO"
            type="date"
            className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Usos máximos (opcional)</span>
          <input
            name="maxRedemptions"
            type="number"
            min="1"
            step="1"
            placeholder="Sin límite"
            className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 focus:border-[var(--color-ink)] focus:outline-none"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium">Solo para una sala (opcional)</span>
          <select
            name="roomSlug"
            className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2"
          >
            <option value="">Todas las salas</option>
            {bookableRooms.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-full bg-[var(--color-ink)] px-5 py-2 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
          >
            Crear cupón
          </button>
        </div>
      </form>

      {/* Listado */}
      <div className="space-y-2">
        {coupons.length === 0 && (
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-12 text-center text-[var(--color-mute)]">
            Aún no hay cupones. Crea el primero arriba.
          </div>
        )}
        {coupons.map((c) => {
          const room = c.roomSlug ? bookableRooms.find((r) => r.slug === c.roomSlug) : null;
          const expired = c.expiresAt ? c.expiresAt.getTime() < Date.now() : false;
          const exhausted = c.maxRedemptions != null && c.redemptions >= c.maxRedemptions;
          const usable = c.active && !expired && !exhausted;
          return (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{c.code}</span>
                  <span className="rounded-full bg-[var(--color-paper-2)] px-2 py-0.5 text-xs">
                    {c.kind === "PERCENT" ? `−${c.value}%` : `−${formatEuros(c.value)}`}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      usable ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {usable ? "Activo" : expired ? "Caducado" : exhausted ? "Agotado" : "Inactivo"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[var(--color-mute)]">
                  {room ? `Solo ${room.name} · ` : ""}
                  Usos: {c.redemptions}
                  {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                  {c.expiresAt ? ` · caduca ${new Date(c.expiresAt).toLocaleDateString("es-ES")}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <form action={toggleCoupon}>
                  <input type="hidden" name="couponId" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs hover:border-[var(--color-ink)]"
                  >
                    {c.active ? "Desactivar" : "Activar"}
                  </button>
                </form>
                <form action={deleteCoupon}>
                  <input type="hidden" name="couponId" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    Borrar
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
