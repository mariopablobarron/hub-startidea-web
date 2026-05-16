import { inviteUser } from "@/lib/users/actions";

/**
 * Formulario para invitar un nuevo usuario. El user se crea inmediatamente
 * con rol pre-asignado y se le manda email avisando. El primer login será
 * vía magic-link (no necesita contraseña previa).
 */
export function InviteForm() {
  return (
    <form action={inviteUser} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-[var(--color-ink)]">Nombre</span>
          <input
            type="text"
            name="name"
            required
            placeholder="Ej. Laura Martínez"
            className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[var(--color-ink)]">Email</span>
          <input
            type="email"
            name="email"
            required
            placeholder="laura@example.com"
            className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-[var(--color-ink)]">Rol</span>
          <select
            name="role"
            required
            defaultValue="MEMBER"
            className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
          >
            <option value="CLIENT">Cliente (sin descuento)</option>
            <option value="MEMBER">Coworker (30% descuento + bonos)</option>
            <option value="COLLABORATOR">Colaborador (20% descuento)</option>
            <option value="ADMIN">Admin (control total)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-[var(--color-ink)]">Membresía (opcional)</span>
          <select
            name="membershipType"
            defaultValue=""
            className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2"
          >
            <option value="">— Ninguna —</option>
            <option value="COWORKER_FIXED">Plaza fija</option>
            <option value="COWORKER_FLEX">Plaza flex</option>
            <option value="OFFICE_PRIVATE">Office privado</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-[var(--color-ink)]">Mensaje personal (opcional)</span>
        <textarea
          name="personalMessage"
          rows={3}
          maxLength={800}
          placeholder="Aparece en el email de bienvenida — para personalizar la invitación."
          className="mt-1 block w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-ink)]"
        />
      </label>

      <button
        type="submit"
        className="rounded-full bg-[var(--color-ink)] px-6 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
      >
        Enviar invitación
      </button>
      <p className="text-xs text-[var(--color-mute)]">
        Si el email ya tiene cuenta, actualizamos el rol y notificamos. El primer
        login es por magic-link (sin password).
      </p>
    </form>
  );
}
