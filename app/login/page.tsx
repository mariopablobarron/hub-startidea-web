import type { Metadata } from "next";
import Link from "next/link";
import { Mail, KeyRound } from "lucide-react";
import { signIn } from "@/auth";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Accede al HUB Startidea con tu email o tu contraseña.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ check?: string; error?: string; callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const cb = sp.callbackUrl || "/me";

  async function magicLink(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email) return;
    await signIn("resend", { email, redirectTo: cb });
  }

  async function passwordLogin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    if (!email || !password) return;
    await signIn("credentials", { email, password, redirectTo: cb });
  }

  return (
    <main className="grid min-h-[80vh] place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <Link href="/" className="inline-flex items-baseline text-2xl font-semibold tracking-tight">
          <span className="text-[var(--color-ink)]">startidea</span>
          <span className="text-[var(--color-coral-500)]">.</span>
        </Link>

        <h1 className="mt-8 font-display text-3xl tracking-tight md:text-4xl">
          Entrar al HUB
        </h1>
        <p className="mt-3 text-[var(--color-mute)]">
          Si ya tienes cuenta, te enviamos un enlace al email o usa tu contraseña.
        </p>

        {sp.check === "email" && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-4 text-sm"
          >
            <strong className="text-[var(--color-ink)]">Revisa tu email.</strong>{" "}
            Te hemos enviado un enlace para entrar. Caduca en 24h.
          </div>
        )}
        {sp.error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            No se pudo iniciar sesión. Revisa el email y la contraseña.
          </div>
        )}

        {/* Magic link */}
        <form
          action={magicLink}
          className="mt-8 space-y-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
        >
          <label htmlFor="email-magic" className="block text-sm font-medium">
            Enviar enlace al email
          </label>
          <div className="flex gap-2">
            <input
              id="email-magic"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tu@email.com"
              className="flex-1 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-ink)]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-500)]"
            >
              <Mail size={14} /> Enviar
            </button>
          </div>
          <p className="text-xs text-[var(--color-mute)]">
            Te llega un email con un enlace seguro. Sin contraseña, sin sumar otra
            cuenta a tu lista.
          </p>
        </form>

        {/* Password */}
        <details className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
          <summary className="cursor-pointer text-sm font-medium">
            ¿Tienes contraseña? Entra con email + contraseña
          </summary>
          <form action={passwordLogin} className="mt-4 space-y-3">
            <div>
              <label htmlFor="email-pw" className="mb-1 block text-sm">Email</label>
              <input
                id="email-pw"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-ink)]"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-ink)]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-500)]"
            >
              <KeyRound size={14} /> Entrar
            </button>
          </form>
        </details>

        <p className="mt-6 text-center text-sm text-[var(--color-mute)]">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-coral-600)]">
            Crear cuenta gratis
          </Link>
        </p>
      </div>
    </main>
  );
}
