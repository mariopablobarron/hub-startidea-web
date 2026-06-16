"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Home,
  MessageSquareQuote,
  Sparkles,
  Phone,
  LayoutGrid,
  Settings,
  BookOpen,
  MessageSquare,
  Search,
  Megaphone,
  Network,
  GitBranch,
  Users,
  CalendarCheck,
  CalendarDays,
  MessageSquareText,
  Euro,
  Ticket,
  Banknote,
  Clapperboard,
  Wand2,
  Music,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: Home, exact: true },
  // Plataforma (BD)
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/reservas", label: "Reservas", icon: CalendarCheck },
  { href: "/admin/tarifas", label: "Tarifas", icon: Euro },
  { href: "/admin/cupones", label: "Cupones", icon: Ticket },
  { href: "/admin/pagos", label: "Pagos · Transferencia", icon: Banknote },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/foro", label: "Foro", icon: MessageSquareText },
  // Contenido (git-based)
  { href: "/admin/hero", label: "Hero", icon: MessageSquareQuote },
  { href: "/admin/manifiesto", label: "Manifiesto", icon: Megaphone },
  { href: "/admin/ecosistema", label: "Ecosistema", icon: Network },
  { href: "/admin/salas", label: "Salas", icon: LayoutGrid },
  { href: "/admin/metodo", label: "Método Raíz y Acción", icon: GitBranch },
  { href: "/admin/comunidad", label: "Comunidad", icon: Sparkles },
  { href: "/admin/contacto", label: "Contacto", icon: Phone },
  { href: "/admin/sitio", label: "Datos del sitio", icon: Settings },
  // Operativa
  { href: "/admin/faq", label: "FAQ chatbot", icon: BookOpen },
  { href: "/admin/conversaciones", label: "Conversaciones", icon: MessageSquare },
  { href: "/admin/seo", label: "SEO (Search Console)", icon: Search },
  { href: "/admin/capsula/torre", label: "Cápsula · Torre de Control", icon: Wand2 },
  { href: "/admin/capsula/musica", label: "Cápsula · Música", icon: Music },
  { href: "/admin/capsula/grabaciones", label: "Cápsula · Grabaciones", icon: Clapperboard },
];

export function AdminSidebar({
  email,
  signOutAction,
}: {
  email: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-60 shrink-0">
      <div className="sticky top-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
        <div className="px-3 py-2">
          <div className="font-display text-lg tracking-tight">HUB Admin</div>
          <div className="truncate text-xs text-[var(--color-mute)]">{email}</div>
        </div>
        <nav aria-label="Secciones del panel" className="mt-2 flex flex-col gap-1">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "text-[var(--color-ink)]/80 hover:bg-[var(--color-paper-2)]",
                )}
              >
                <n.icon size={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOutAction} className="mt-3 border-t border-[var(--color-line)] pt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-mute)] hover:bg-red-50 hover:text-red-600"
          >
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
  );
}
