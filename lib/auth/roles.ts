import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

/**
 * Helpers de autorización por rol.
 *
 * Uso típico en server components y server actions:
 *   const user = await requireRole(["ADMIN"]);
 *   const user = await requireMember();  // MEMBER, COLLABORATOR, ADMIN
 *
 * Si el usuario no tiene el rol, redirige a /login (sin sesión) o /
 * (con sesión insuficiente). No lanza excepción — Next.js requiere
 * redirect() para que el flujo HTTP funcione.
 */

export type AuthedUser = {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
};

/** Devuelve user autenticado o null. NO redirige. */
export async function getCurrentUser(): Promise<AuthedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

/** Exige sesión. Redirige a /login si no la hay. */
export async function requireAuth(callbackUrl?: string): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) {
    const cb = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
    redirect(`/login${cb}`);
  }
  return user;
}

/** Exige rol concreto (o varios). */
export async function requireRole(
  roles: Role[],
  callbackUrl?: string,
): Promise<AuthedUser> {
  const user = await requireAuth(callbackUrl);
  if (!roles.includes(user.role)) {
    // Logged pero rol insuficiente — vuelve a la home con error
    redirect("/?error=forbidden");
  }
  return user;
}

/** MEMBER, COLLABORATOR o ADMIN (cualquier "miembro" del HUB). */
export async function requireMember(callbackUrl?: string): Promise<AuthedUser> {
  return requireRole(["MEMBER", "COLLABORATOR", "ADMIN"], callbackUrl);
}

/** Solo ADMIN. */
export async function requireAdmin(callbackUrl?: string): Promise<AuthedUser> {
  return requireRole(["ADMIN"], callbackUrl);
}

/** Para checks no bloqueantes (server components). */
export async function hasRole(roles: Role[]): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

/** Etiquetas en español por rol — para UI. */
export const ROLE_LABEL: Record<Role, string> = {
  VISITOR: "Visitante",
  CLIENT: "Cliente",
  MEMBER: "Coworker",
  COLLABORATOR: "Colaborador",
  ADMIN: "Admin",
};

/** Descripciones largas para admin /users. */
export const ROLE_DESCRIPTION: Record<Role, string> = {
  VISITOR: "Sin login o cuenta básica sin permisos.",
  CLIENT: "Cliente puntual. Reserva con pago, sin descuento.",
  MEMBER: "Coworker activo con plaza fija o flex.",
  COLLABORATOR: "Red Startidea. 20% descuento en reservas.",
  ADMIN: "Equipo del HUB. Acceso total al panel.",
};
