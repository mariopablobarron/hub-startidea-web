import type { NextAuthConfig } from "next-auth";

/**
 * Configuración base de NextAuth — separada de auth.ts para que
 * Next.js Middleware (edge runtime) pueda importarla sin arrastrar
 * Prisma/bcrypt.
 *
 * Rutas protegidas:
 * - /admin/*    → SOLO ADMIN
 * - /me/*       → cualquier sesión válida (CLIENT/MEMBER/COLLABORATOR/ADMIN)
 * - /reservar   → cualquier sesión válida
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

      // /me/* y /reservar → cualquier sesión
      if (path.startsWith("/me") || path.startsWith("/reservar")) {
        return isLogged;
      }

      // Resto pública
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
