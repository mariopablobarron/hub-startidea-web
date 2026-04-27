import { signIn } from "@/auth";

export const metadata = { title: "Login · Admin", robots: "noindex" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (e: unknown) {
      const isRedirect = (e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT");
      if (isRedirect) throw e;
      const next = new URL("/admin/login", "http://localhost");
      next.searchParams.set("error", "credenciales");
      throw new Error(next.search);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--color-paper-2)] p-6">
      <form
        action={login}
        className="w-full max-w-sm space-y-5 rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 shadow-[var(--shadow-soft)]"
      >
        <div>
          <div className="font-display text-3xl tracking-tight">HUB Admin</div>
          <p className="mt-1 text-sm text-[var(--color-mute)]">
            Acceso restringido al equipo de Startidea.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Email o contraseña incorrectos.
          </div>
        )}

        <label className="block text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            defaultValue={callbackUrl ? "" : ""}
            className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm focus:border-[var(--color-ink)] focus:outline-none"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">Contraseña</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm focus:border-[var(--color-ink)] focus:outline-none"
          />
        </label>

        <button type="submit" className="btn-primary w-full justify-center">
          Entrar
        </button>
      </form>
    </div>
  );
}
