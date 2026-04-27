import Link from "next/link";
import { content } from "@/lib/content";
import { ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const cards = [
    { href: "/admin/hero", title: "Hero principal", desc: "Eyebrow, título, subtítulo, CTAs y stats." },
    { href: "/admin/salas", title: `Salas (${content.rooms.length})`, desc: "Editar nombre, descripción, capacidad, equipamiento y foto." },
    { href: "/admin/comunidad", title: "Comunidad", desc: "Texto y los 3 pilares de la sección Comunidad." },
    { href: "/admin/contacto", title: "Contacto", desc: "Texto del CTA final, horario y direcciones." },
    { href: "/admin/sitio", title: "Datos del sitio", desc: "Email, teléfono, dirección, redes sociales." },
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <h1 className="font-display text-3xl tracking-tight">Panel de administración</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-mute)]">
          Cada cambio se guarda como commit en GitHub y dispara un redeploy automático en Coolify.
          Pasados 1-2 minutos verás los cambios reflejados en{" "}
          <a href="/" target="_blank" className="text-[var(--color-coral-600)] underline">
            hubstartidea.es
          </a>
          .
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 transition hover:border-[var(--color-ink)]"
          >
            <div>
              <div className="font-display text-xl tracking-tight">{c.title}</div>
              <p className="mt-2 text-sm text-[var(--color-mute)]">{c.desc}</p>
            </div>
            <ArrowRight size={18} className="mt-1 shrink-0 text-[var(--color-mute)] group-hover:text-[var(--color-ink)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
