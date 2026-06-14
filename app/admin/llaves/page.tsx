import { KeyRound, ShieldCheck, ShieldOff, Clock, User as UserIcon } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/roles";
import { PageHeader, Field, Input, FlashBanner } from "../_components/Field";
import {
  createKeyHolder,
  revokeKeyHolder,
  reactivateKeyHolder,
  ACCESS_LABEL,
} from "@/lib/admin/keyholders";
import type { AccessType } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ saved?: string; error?: string; ver?: string }>;
};

const ACCESS_OPTIONS: { value: AccessType; label: string }[] = [
  { value: "PHYSICAL_KEY", label: "Llave física" },
  { value: "BUILDING_KEY", label: "Llave portal" },
  { value: "ALARM_CODE", label: "Código alarma" },
  { value: "ACCESS_CARD", label: "Tarjeta proximidad" },
  { value: "GARAGE_REMOTE", label: "Mando garaje" },
  { value: "OTHER", label: "Otro" },
];

export default async function LlavesAdminPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const showRevoked = sp.ver === "todos" || sp.ver === "baja";

  const [active, revoked] = await Promise.all([
    prisma.keyHolder.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ accessType: "asc" }, { name: "asc" }],
    }),
    prisma.keyHolder.findMany({
      where: { status: "REVOKED" },
      orderBy: { revokedAt: "desc" },
      take: 100,
    }),
  ]);

  // Conteo por tipo de acceso (resumen rápido arriba)
  const byType = new Map<AccessType, number>();
  for (const k of active) byType.set(k.accessType, (byType.get(k.accessType) ?? 0) + 1);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Control de acceso · Llaves"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Quién tiene llave, código o tarjeta del HUB. Registro documental con histórico — dar de baja no borra, queda auditado."
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {/* Resumen */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] px-5 py-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-mute)]">
            <ShieldCheck size={14} className="text-emerald-600" /> Accesos activos
          </div>
          <div className="mt-1 font-display text-3xl tracking-tight">{active.length}</div>
        </div>
        {[...byType.entries()].map(([type, count]) => (
          <div key={type} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] px-4 py-4">
            <div className="text-xs text-[var(--color-mute)]">{ACCESS_LABEL[type]}</div>
            <div className="mt-1 font-display text-2xl tracking-tight">{count}</div>
          </div>
        ))}
      </div>

      {/* Alta */}
      <form
        action={createKeyHolder}
        className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
      >
        <h2 className="flex items-center gap-2 font-display text-lg">
          <KeyRound size={18} className="text-[var(--color-coral-600)]" /> Dar de alta un acceso
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre completo">
            <Input name="name" required placeholder="María García" />
          </Field>
          <Field label="Rol / motivo" hint="Coworker, limpieza, mantenimiento, staff…">
            <Input name="role" placeholder="Coworker fijo" />
          </Field>
          <Field label="Email (opcional)" hint="Si es miembro del HUB, lo vinculamos a su cuenta.">
            <Input type="email" name="email" placeholder="maria@empresa.com" />
          </Field>
          <Field label="Teléfono (opcional)">
            <Input type="tel" name="phone" placeholder="+34 600 123 456" />
          </Field>
          <Field label="Tipo de acceso">
            <select
              name="accessType"
              defaultValue="PHYSICAL_KEY"
              className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-ink)]"
            >
              {ACCESS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Identificador (opcional)" hint="Nº de copia grabado, últimos dígitos del código, nº tarjeta.">
            <Input name="identifier" placeholder="Copia #3" />
          </Field>
        </div>
        <Field label="Notas (opcional)">
          <Input name="notes" placeholder="Devuelve la llave al terminar contrato" />
        </Field>
        <button type="submit" className="btn-primary">Registrar acceso</button>
      </form>

      {/* Listado activos */}
      <section>
        <h2 className="font-display text-lg">Accesos activos ({active.length})</h2>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-mute)]">
            Aún no hay accesos registrados. Da de alta el primero arriba.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {active.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{k.name}</span>
                    <span className="rounded-full bg-[var(--color-paper-2)] px-2.5 py-0.5 text-xs text-[var(--color-ink)]">
                      {ACCESS_LABEL[k.accessType]}
                    </span>
                    {k.identifier && (
                      <span className="text-xs text-[var(--color-mute)]">· {k.identifier}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-mute)]">
                    {k.role && <span>{k.role}</span>}
                    {k.email && <span className="inline-flex items-center gap-1"><UserIcon size={11} />{k.email}</span>}
                    {k.phone && <span>{k.phone}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} /> desde {fmtDate(k.grantedAt)}
                    </span>
                    {k.grantedBy && <span>· alta por {k.grantedBy}</span>}
                  </div>
                  {k.notes && <p className="mt-1 text-xs italic text-[var(--color-mute)]">{k.notes}</p>}
                </div>
                <form action={revokeKeyHolder} className="flex shrink-0 items-center gap-2">
                  <input type="hidden" name="id" value={k.id} />
                  <input
                    type="text"
                    name="reason"
                    placeholder="Motivo baja (opcional)"
                    className="w-40 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-ink)]"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    <ShieldOff size={12} /> Dar de baja
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Histórico de bajas */}
      <section>
        <details open={showRevoked}>
          <summary className="cursor-pointer font-display text-lg">
            Histórico de bajas ({revoked.length})
          </summary>
          {revoked.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-mute)]">Sin bajas todavía.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {revoked.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-4 opacity-80"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium line-through">{k.name}</span>
                      <span className="text-xs text-[var(--color-mute)]">{ACCESS_LABEL[k.accessType]}</span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-mute)]">
                      Baja {k.revokedAt ? fmtDate(k.revokedAt) : "?"}
                      {k.revokedBy && ` · por ${k.revokedBy}`}
                      {k.revokeReason && ` · ${k.revokeReason}`}
                    </div>
                  </div>
                  <form action={reactivateKeyHolder} className="shrink-0">
                    <input type="hidden" name="id" value={k.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs hover:border-[var(--color-ink)]"
                    >
                      <ShieldCheck size={12} /> Reactivar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>
    </div>
  );
}
