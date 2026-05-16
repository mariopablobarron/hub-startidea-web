import Link from "next/link";
import { content } from "@/lib/content";
import { prisma } from "@/lib/db/prisma";
import {
  ArrowRight,
  MessageSquareQuote,
  Megaphone,
  Network,
  LayoutGrid,
  GitBranch,
  Sparkles,
  Phone,
  Settings,
  BookOpen,
  MessageSquare,
  Search,
  Users,
} from "lucide-react";

type Card = {
  href: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: "plataforma" | "narrativa" | "alquiler" | "site" | "chatbot" | "datos";
};

const CARDS: Card[] = [
  // Plataforma — BD
  {
    href: "/admin/users",
    title: "Usuarios",
    desc: "Coworkers, clientes, colaboradores. Asignar roles e invitar.",
    icon: Users,
    group: "plataforma",
  },
  // Narrativa principal
  {
    href: "/admin/hero",
    title: "Hero principal",
    desc: "Eyebrow, título, subtítulo, CTAs y stats.",
    icon: MessageSquareQuote,
    group: "narrativa",
  },
  {
    href: "/admin/manifiesto",
    title: "Manifiesto",
    desc: "Bloque que cuenta las dos caras del HUB (espacio + ecosistema).",
    icon: Megaphone,
    group: "narrativa",
  },
  {
    href: "/admin/ecosistema",
    title: "Ecosistema Startidea",
    desc: "Proyectos hermanos (web + cinta del footer).",
    icon: Network,
    group: "narrativa",
  },
  // Alquiler / coworking
  {
    href: "/admin/salas",
    title: `Salas (${content.rooms.length})`,
    desc: "Editar nombre, descripción, capacidad, equipamiento y foto.",
    icon: LayoutGrid,
    group: "alquiler",
  },
  {
    href: "/admin/metodo",
    title: "Método Raíz y Acción",
    desc: "Bloque destacado del método de la casa.",
    icon: GitBranch,
    group: "alquiler",
  },
  {
    href: "/admin/comunidad",
    title: "Comunidad",
    desc: "Texto y los 3 pilares de la sección Comunidad.",
    icon: Sparkles,
    group: "alquiler",
  },
  // Datos del sitio
  {
    href: "/admin/contacto",
    title: "Contacto",
    desc: "Texto del CTA final, horario y direcciones.",
    icon: Phone,
    group: "datos",
  },
  {
    href: "/admin/sitio",
    title: "Datos del sitio",
    desc: "Email, teléfono, dirección, redes sociales.",
    icon: Settings,
    group: "datos",
  },
  // Operativa
  {
    href: "/admin/faq",
    title: "FAQ chatbot",
    desc: "Respuestas que el bot público usa.",
    icon: BookOpen,
    group: "chatbot",
  },
  {
    href: "/admin/conversaciones",
    title: "Conversaciones",
    desc: "Histórico de chats. Aprende qué te preguntan.",
    icon: MessageSquare,
    group: "chatbot",
  },
  {
    href: "/admin/seo",
    title: "SEO · Search Console",
    desc: "Clicks, impresiones, queries y posición en Google.",
    icon: Search,
    group: "site",
  },
];

const GROUPS: Array<{ id: Card["group"]; label: string }> = [
  { id: "plataforma", label: "Plataforma (usuarios y operativa)" },
  { id: "narrativa", label: "Narrativa principal" },
  { id: "alquiler", label: "Coworking · método · comunidad" },
  { id: "datos", label: "Datos del sitio" },
  { id: "chatbot", label: "Chatbot público" },
  { id: "site", label: "SEO y analítica" },
];

export default async function AdminDashboard() {
  const userCount = await prisma.user.count();

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h1 className="font-display text-3xl tracking-tight">Panel de administración</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-mute)]">
          {userCount} usuario{userCount === 1 ? "" : "s"} en la plataforma. Los cambios de contenido
          se commitean a GitHub y se redeployan en 1-2 minutos. Los cambios de plataforma
          (usuarios, reservas) son inmediatos.
        </p>
      </header>

      {GROUPS.map((g) => {
        const cards = CARDS.filter((c) => c.group === g.id);
        if (cards.length === 0) return null;
        return (
          <section key={g.id} className="space-y-3">
            <h2 className="text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">
              {g.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-ink)] hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="shrink-0 text-[var(--color-coral-500)]" />
                        <div className="truncate font-display text-base tracking-tight">{c.title}</div>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-mute)]">{c.desc}</p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="mt-1 shrink-0 text-[var(--color-mute)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
