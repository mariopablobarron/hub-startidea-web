import Link from "next/link";
import Image from "next/image";
import { content } from "@/lib/content";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "../_components/Field";

export default function SalasAdmin() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Salas"
        back={{ href: "/admin", label: "Dashboard" }}
        description="Editar nombre, descripción, capacidad, equipamiento y foto de cada sala."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {content.rooms.map((r) => (
          <Link
            key={r.slug}
            href={`/admin/salas/${r.slug}`}
            className="group flex gap-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 transition hover:border-[var(--color-ink)]"
          >
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-[var(--color-paper-2)]">
              <Image src={r.image} alt={r.name} fill sizes="128px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">{r.subtitle}</div>
              <div className="mt-1 font-display text-lg tracking-tight">{r.name}</div>
              <div className="mt-1 text-xs text-[var(--color-mute)]">{r.area} m² · {r.planLabel}</div>
              <div className="mt-auto flex items-center justify-end text-sm text-[var(--color-mute)] group-hover:text-[var(--color-ink)]">
                Editar <ArrowRight size={14} className="ml-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
