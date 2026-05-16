import Link from "next/link";
import { UserPlus, Search } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, ROLE_LABEL } from "@/lib/auth/roles";
import { PageHeader, FlashBanner } from "../_components/Field";
import { UserRow } from "./_components/UserRow";
import { InviteForm } from "./_components/InviteForm";
import type { Role } from "@prisma/client";

type Props = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    q?: string;
    role?: string;
  }>;
};

const ROLE_VALUES: Role[] = ["VISITOR", "CLIENT", "MEMBER", "COLLABORATOR", "ADMIN"];

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const roleFilter = ROLE_VALUES.includes(sp.role as Role) ? (sp.role as Role) : undefined;

  // Counts por rol (para tabs)
  const counts = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });
  const countByRole: Record<string, number> = {};
  let total = 0;
  for (const c of counts) {
    countByRole[c.role] = c._count._all;
    total += c._count._all;
  }

  // Lista filtrada
  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        back={{ href: "/admin", label: "Dashboard" }}
        description={`${total} usuarios en total. Asigna roles, invita coworkers y colaboradores.`}
      />
      <FlashBanner saved={sp.saved === "1"} error={sp.error} />

      {/* Invitar */}
      <details className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <summary className="flex cursor-pointer items-center gap-2 font-display text-lg">
          <UserPlus size={18} className="text-[var(--color-coral-500)]" />
          Invitar nuevo usuario
        </summary>
        <div className="mt-6">
          <InviteForm />
        </div>
      </details>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
        <form className="flex flex-1 items-center gap-2 min-w-[200px]">
          <Search size={14} className="text-[var(--color-mute)]" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por email o nombre"
            className="flex-1 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-ink)]"
          />
          {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
        </form>

        <div className="flex flex-wrap gap-1.5">
          <RoleChip href="/admin/users" active={!roleFilter} label="Todos" count={total} />
          {ROLE_VALUES.map((r) => (
            <RoleChip
              key={r}
              href={`/admin/users?role=${r}`}
              active={roleFilter === r}
              label={ROLE_LABEL[r]}
              count={countByRole[r] || 0}
            />
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--color-line)] bg-[var(--color-paper-2)]">
            <tr className="text-left text-xs uppercase tracking-[0.12em] text-[var(--color-mute)]">
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Membresía</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-mute)]">
                  No hay usuarios con esos filtros.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </tbody>
        </table>
        {users.length === 100 && (
          <div className="border-t border-[var(--color-line)] px-4 py-3 text-xs text-[var(--color-mute)]">
            Mostrando 100 primeros. Refina la búsqueda para encontrar usuarios concretos.
          </div>
        )}
      </div>
    </div>
  );
}

function RoleChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${
        active
          ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
          : "border border-[var(--color-line)] text-[var(--color-mute)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 ${active ? "bg-white/15" : "bg-[var(--color-paper-2)]"}`}>
        {count}
      </span>
    </Link>
  );
}
