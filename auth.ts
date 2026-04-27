import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

async function verifyPassword(plain: string): Promise<boolean> {
  if (ADMIN_PASSWORD_HASH) {
    return bcrypt.compare(plain, ADMIN_PASSWORD_HASH);
  }
  if (ADMIN_PASSWORD) {
    // Fallback: comparación directa cuando no hay hash configurado.
    // Suficiente para 1 usuario hardcoded, NO para multi-user.
    return plain === ADMIN_PASSWORD;
  }
  return false;
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email || "").toLowerCase().trim();
        const password = String(creds?.password || "");
        if (!email || !password) return null;
        if (email !== ADMIN_EMAIL.toLowerCase()) return null;
        const ok = await verifyPassword(password);
        if (!ok) return null;
        return { id: "admin", email: ADMIN_EMAIL, name: "Admin" };
      },
    }),
  ],
});
