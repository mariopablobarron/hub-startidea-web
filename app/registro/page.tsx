import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { signIn } from "@/auth";
import { sendWelcomeEmail } from "@/lib/mail/welcome";
import { ingestContactToCrm } from "@/lib/crm/ingest";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea tu cuenta en el HUB Startidea. Te enviamos un enlace de acceso al email.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ error?: string; callbackUrl?: string }> };

export default async function RegistroPage({ searchParams }: Props) {
  const sp = await searchParams;
  // Dónde aterrizar tras click en magic-link. Por defecto /me; si el
  // visitor venía de /reservar (u otra ruta protegida), respetamos esa
  // intención y le llevamos directo allí tras crear cuenta.
  const callbackUrl = sp.callbackUrl || "/me";

  async function register(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const name = String(formData.get("name") || "").trim();
    const cb = String(formData.get("callbackUrl") || "/me");
    if (!email || !name) {
      const qs = new URLSearchParams({ error: "missing" });
      if (cb !== "/me") qs.set("callbackUrl", cb);
      redirect(`/registro?${qs.toString()}`);
    }

    // Distinguir alta-nueva vs login-de-existente para enviar welcome
    // email solo a los nuevos. Si ya existía, este flujo equivale a un
    // login con magic-link (sin spam de bienvenida).
    const existing = await prisma.user.findUnique({ where: { email } });
    const isNew = !existing;

    if (isNew) {
      await prisma.user.create({
        data: { email, name, role: "VISITOR" },
      });
      // Welcome email "best-effort": si Resend falla, no rompe el registro.
      // Se envía en paralelo al magic-link para que el user reciba ambos.
      void sendWelcomeEmail({ to: email, name, callbackUrl: cb });
      // Nuevo registro → CRM central. await porque signIn() redirige
      // después; el helper nunca lanza (no rompe el alta).
      await ingestContactToCrm({
        email,
        name,
        source: "hub-coworking:registro",
        tags: ["registro"],
        kind: "newsletter",
      });
    }

    // Disparar magic-link → tras click en el email, aterriza en callbackUrl
    await signIn("resend", { email, redirectTo: cb });
  }

  return (
    <main className="grid min-h-[80vh] place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-baseline text-2xl font-semibold tracking-tight">
          <span className="text-[var(--color-ink)]">startidea</span>
          <span className="text-[var(--color-coral-500)]">.</span>
        </Link>

        <h1 className="mt-8 font-display text-3xl tracking-tight md:text-4xl">
          Crear cuenta
        </h1>
        <p className="mt-3 text-[var(--color-mute)]">
          Acceso al ecosistema Startidea: reservar salas, ver eventos privados y
          participar en la comunidad. Sin contraseña — entras por email.
        </p>

        {sp.error && (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            Faltan datos. Rellena email y nombre.
          </div>
        )}

        <form
          action={register}
          className="mt-8 space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="block w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-ink)]"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-ink)]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--color-ink)] px-4 py-3 text-sm font-medium text-[var(--color-paper)] transition hover:bg-[var(--color-coral-500)]"
          >
            Recibir enlace de acceso
          </button>
          <p className="text-xs text-[var(--color-mute)]">
            Al crear cuenta aceptas la{" "}
            <Link href="/privacidad" className="underline underline-offset-2">política de privacidad</Link>.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-mute)]">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={callbackUrl !== "/me" ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
            className="font-medium text-[var(--color-ink)] underline underline-offset-2 hover:text-[var(--color-coral-600)]"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
