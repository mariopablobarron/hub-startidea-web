import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Páginas que pasan por authConfig.callbacks.authorized.
  // /login se incluye para redirigir a /me o /admin si ya hay sesión.
  matcher: ["/admin/:path*", "/me/:path*", "/reservar/:path*", "/login"],
};
