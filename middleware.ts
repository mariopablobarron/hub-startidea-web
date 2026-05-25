import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Páginas que pasan por authConfig.callbacks.authorized.
  // /login se incluye para redirigir a /me o /admin si ya hay sesión.
  // /reservar NO está aquí — la página decide qué mostrar (landing
  // pública para anónimos, form para logueados). createBooking server
  // action mantiene requireAuth() para que la mutación sí esté protegida.
  matcher: ["/admin/:path*", "/me/:path*", "/login"],
};
