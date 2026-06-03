import { updateUserRole } from "@/lib/users/actions";
import { ROLE_LABEL } from "@/lib/auth/roles";
import type { Role, MembershipType, User } from "@prisma/client";

const ROLE_VALUES: Role[] = ["VISITOR", "CLIENT", "MEMBER", "COLLABORATOR", "ADMIN"];
const MEMBERSHIP_VALUES: MembershipType[] = ["COWORKER_FIXED", "COWORKER_FLEX", "OFFICE_PRIVATE"];
const MEMBERSHIP_LABEL: Record<MembershipType, string> = {
  COWORKER_FIXED: "Plaza fija",
  COWORKER_FLEX: "Plaza flex",
  OFFICE_PRIVATE: "Office privado",
};

/**
 * Fila de usuario en la tabla — incluye form inline para editar rol y
 * membresía. El form usa los attributes `form="user-..."` para escapar
 * del `<tr>` y poder enviarse vía server action sin hidratar el cliente.
 */
export function UserRow({ user }: { user: User }) {
  const formId = `user-${user.id}`;
  const roleColor: Record<Role, string> = {
    VISITOR: "bg-gray-100 text-gray-700",
    CLIENT: "bg-blue-50 text-blue-700",
    MEMBER: "bg-emerald-50 text-emerald-700",
    COLLABORATOR: "bg-amber-50 text-amber-700",
    ADMIN: "bg-[var(--color-coral-100)] text-[var(--color-coral-700)]",
  };

  return (
    <tr className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper-2)]/40">
      <td className="px-4 py-3">
        <div className="font-medium text-[var(--color-ink)]">{user.name || "—"}</div>
        <div className="text-xs text-[var(--color-mute)]">{user.email}</div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleColor[user.role]}`}>
          {ROLE_LABEL[user.role]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {user.membershipType ? (
          <span>{MEMBERSHIP_LABEL[user.membershipType]}</span>
        ) : (
          <span className="text-[var(--color-mute)]">—</span>
        )}
        {user.membershipUntil && (
          <div className="text-xs text-[var(--color-mute)]">
            hasta {new Date(user.membershipUntil).toLocaleDateString("es-ES")}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-[var(--color-mute)]">
        {new Date(user.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
      </td>
      <td className="px-4 py-3 text-right">
        <details className="inline-block text-left">
          <summary className="cursor-pointer rounded-full border border-[var(--color-line)] px-3 py-1 text-xs hover:border-[var(--color-ink)]">
            Editar
          </summary>
          <form
            id={formId}
            action={updateUserRole}
            className="mt-2 grid w-72 gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-3 text-xs shadow-soft"
          >
            <input type="hidden" name="userId" value={user.id} />

            <label>
              <span className="block font-medium text-[var(--color-ink)]">Rol</span>
              <select
                name="role"
                defaultValue={user.role}
                className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-2 py-1.5"
              >
                {ROLE_VALUES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="block font-medium text-[var(--color-ink)]">Membresía</span>
              <select
                name="membershipType"
                defaultValue={user.membershipType || ""}
                className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-2 py-1.5"
              >
                <option value="">— Ninguna —</option>
                {MEMBERSHIP_VALUES.map((m) => (
                  <option key={m} value={m}>{MEMBERSHIP_LABEL[m]}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="block font-medium text-[var(--color-ink)]">Hasta (opcional)</span>
              <input
                type="date"
                name="membershipUntilISO"
                defaultValue={user.membershipUntil ? new Date(user.membershipUntil).toISOString().slice(0, 10) : ""}
                className="mt-1 block w-full rounded-lg border border-[var(--color-line)] bg-white px-2 py-1.5"
              />
            </label>

            <label>
              <span className="block font-medium text-[var(--color-ink)]">Descuento personal</span>
              <div className="mt-1 flex gap-2">
                <select
                  name="discountKind"
                  defaultValue={user.discountKind || ""}
                  className="block w-1/2 rounded-lg border border-[var(--color-line)] bg-white px-2 py-1.5"
                >
                  <option value="">— Ninguno —</option>
                  <option value="PERCENT">% porcentaje</option>
                  <option value="FIXED">€ importe</option>
                </select>
                <input
                  type="number"
                  name="discountValue"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  defaultValue={
                    user.discountValue == null
                      ? ""
                      : user.discountKind === "FIXED"
                        ? (user.discountValue / 100).toString()
                        : user.discountValue.toString()
                  }
                  className="block w-1/2 rounded-lg border border-[var(--color-line)] bg-white px-2 py-1.5"
                />
              </div>
              <span className="mt-1 block text-[10px] leading-snug text-[var(--color-mute)]">
                % sobre la tarifa o € fijos. Se aplica el más ventajoso; no se acumula con el descuento de rol.
              </span>
            </label>

            <button
              type="submit"
              className="mt-1 rounded-lg bg-[var(--color-ink)] px-3 py-1.5 text-xs font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
            >
              Guardar cambios
            </button>
          </form>
        </details>
      </td>
    </tr>
  );
}
