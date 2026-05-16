import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@prisma/client";

/**
 * Auth de la plataforma HUB Startidea — F1 (May 2026).
 *
 * Sustituye al sistema anterior (1 admin hardcoded en env) por uno
 * multi-usuario con roles que consulta la BD.
 *
 * Providers:
 * 1. Credentials (email + password) — para usuarios con password local
 * 2. Resend (magic-link) — para invitaciones y login sin password
 *
 * Adapter Prisma activo para que Account/Session/VerificationToken se
 * persistan en hub-db. Session sigue siendo JWT (más simple que DB
 * session, suficiente para el caso de uso del HUB).
 *
 * El usuario admin original (ADMIN_EMAIL/ADMIN_PASSWORD) sigue funcionando
 * porque el seed lo creó como ADMIN en la BD con el mismo password hash.
 */

declare module "next-auth" {
  interface User {
    role?: Role;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
    };
  }
}

// El módulo "next-auth/jwt" no se exporta en v5 — augmentamos el callback
// directamente vía el tipo de `token` en jwt(). NextAuth v5 lo infiere.

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  // PrismaAdapter requerido para Resend (magic-link) — guarda los
  // VerificationToken. Para Credentials con JWT no es estrictamente
  // necesario pero unifica el flujo.
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 }, // 30 días
  providers: [
    // Login clásico email+password
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email || "").toLowerCase().trim();
        const password = String(creds?.password || "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Actualizar lastLoginAt sin esperar
        prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          image: user.image || undefined,
          role: user.role,
        };
      },
    }),

    // Magic-link via Resend — para usuarios sin password (invitados)
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
      async sendVerificationRequest({ identifier, url }) {
        const { Resend: ResendSDK } = await import("resend");
        const resend = new ResendSDK(process.env.RESEND_API_KEY!);
        const host = new URL(url).host;
        await resend.emails.send({
          from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
          to: identifier,
          subject: "Entra al HUB — tu enlace de acceso",
          html: `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4efe6;font-family:-apple-system,system-ui,sans-serif;color:#2a2a2a;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #ddd5c4;">
    <tr><td style="padding:32px 28px;">
      <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">
        <span style="color:#2a2a2a;">startidea</span><span style="color:#e63e73;">.</span>
      </div>
      <h1 style="font-size:24px;margin:20px 0 12px;font-weight:600;line-height:1.2;">Tu acceso al HUB Startidea</h1>
      <p style="font-size:15px;line-height:1.6;color:#666;margin:0 0 24px;">Pulsa el botón para entrar. El enlace caduca en 24 horas y solo funciona una vez.</p>
      <a href="${url}" style="display:inline-block;padding:14px 24px;background:#2a2a2a;color:#f4efe6;text-decoration:none;border-radius:999px;font-size:15px;font-weight:500;">Entrar al HUB</a>
      <p style="font-size:13px;line-height:1.5;color:#999;margin:24px 0 0;">Si no fuiste tú quien pidió este enlace, ignora este mensaje.</p>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#fafafa;color:#999;font-size:12px;border-radius:0 0 14px 14px;">
      HUB Startidea · C/ Conde Cifuentes 33 · Granada · <a href="https://${host}" style="color:#999;">${host}</a>
    </td></tr>
  </table>
</body></html>`,
          text: `Tu acceso al HUB Startidea\n\nPulsa el enlace para entrar (caduca en 24h):\n${url}\n\nSi no fuiste tú, ignora este mensaje.`,
        });
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user.role as Role) || "VISITOR";
      }
      // Refrescar rol desde BD si la session se actualiza (admin cambia role)
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (fresh) token.role = fresh.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      if (token?.role) session.user.role = token.role as Role;
      return session;
    },
  },
});
