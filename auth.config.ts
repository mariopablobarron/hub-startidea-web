import type { NextAuthConfig } from "next-auth";
// `import type` se borra en compilación — no arrastra código Prisma al edge.
import type { Role } from "@prisma/client";

/**
 * Configuración base de NextAuth — separada de auth.ts para que
 * Next.js Middleware (edge runtime) pueda importarla sin arrastrar
 * Prisma/bcrypt.
 *
 * Rutas protegidas:
 * - /admin/*    → SOLO ADMIN
 * - /me/*       → cualquier sesión válida (CLIENT/MEMBER/COLLABORATOR/ADMIN)
 *
 * /reservar es PÚBLICA: la propia página decide. Si no hay sesión,
 * renderiza una landing seductora (AnonymousLanding) con CTAs a /registro
 * y /login para reducir fricción del primer-uso. Si hay sesión, muestra
 * el form de reserva. El sistema sigue siendo privado: createBooking
 * server action SÍ requiere requireAuth() y el form solo aparece con
 * sesión válida.
 */

export const authConfig = {
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check=email",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const session = auth;
      const isLogged = !!session?.user;
      const role = session?.user?.role;
      const path = nextUrl.pathname;

      // Páginas de login: si ya hay sesión, redirige según rol
      const isOnLogin = path === "/login" || path === "/admin/login";
      if (isOnLogin && isLogged) {
        const dest = role === "ADMIN" ? "/admin" : "/me";
        return Response.redirect(new URL(dest, nextUrl));
      }

      // /admin/* → SOLO ADMIN (login propio cubierto arriba)
      if (path.startsWith("/admin")) {
        if (!isLogged) return false;
        return role === "ADMIN";
      }

      // /me/* → cualquier sesión.
      // /reservar queda fuera del check: la página decide qué mostrar
      // según haya sesión o no (landing pública vs form privado).
      if (path.startsWith("/me")) {
        return isLogged;
      }

      // Resto pública
      return true;
    },

    // Los callbacks jwt y session se definen aquí (sin Prisma/bcrypt) para
    // que el middleware en edge runtime pueda leer session.user.role.
    // auth.ts los sobrescribe con versiones más ricas (trigger=update, etc.):
    // al hacer `...authConfig.callbacks` los callbacks de auth.ts ganan.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // user.role viene del Credentials authorize() o del magic-link adapter.
        // Usamos casting a string para no importar @prisma/client en edge.
        token.role = ((user as { role?: Role }).role) ?? ("VISITOR" as Role);
      }
      return token;
    },
    session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      if (token?.role) session.user.role = token.role as Role;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
