import Link from "next/link";
import { auth, signOut } from "@/auth";
import { LogOut, Home, MessageSquareQuote, Sparkles, Phone, LayoutGrid, Settings } from "lucide-react";

export const metadata = { title: "Admin · HUB Startidea", robots: "noindex" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // /admin/login no usa este layout porque tiene su propio diseño full-screen.
  // Si por alguna razón alguien sin sesión llega aquí, el middleware ya redirigió.
  if (!session?.user) {
    return <div className="p-8">{children}</div>;
  }

  const nav = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/hero", label: "Hero", icon: MessageSquareQuote },
    { href: "/admin/salas", label: "Salas", icon: LayoutGrid },
    { href: "/admin/comunidad", label: "Comunidad", icon: Sparkles },
    { href: "/admin/contacto", label: "Contacto", icon: Phone },
    { href: "/admin/sitio", label: "Datos del sitio", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-paper-2)]">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-8">
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
            <div className="px-3 py-2">
              <div className="font-display text-lg tracking-tight">HUB Admin</div>
              <div className="text-xs text-[var(--color-mute)]">{session.user.email}</div>
            </div>
            <nav className="mt-2 flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-ink)]/80 hover:bg-[var(--color-paper-2)]"
                >
                  <n.icon size={16} />
                  {n.label}
                </Link>
              ))}
            </nav>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
              className="mt-3 border-t border-[var(--color-line)] pt-3"
            >
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-mute)] hover:bg-red-50 hover:text-red-600">
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </form>
            <Link
              href="/"
              target="_blank"
              className="mt-3 block px-3 py-2 text-xs text-[var(--color-mute)] hover:text-[var(--color-coral-600)]"
            >
              Ver web pública ↗
            </Link>
          </div>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
