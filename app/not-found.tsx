import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { rooms } from "@/lib/content";

export default function NotFound() {
  // Mostrar 3 salas para invitar a quedarse en la web (cross-link interno).
  const featured = rooms.slice(0, 3);

  return (
    <div className="container-page py-24 md:py-32">
      <div className="max-w-3xl">
        <div className="font-display text-7xl tracking-tight md:text-9xl">404</div>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-mute)]">
          Esta página no existe en el HUB. Quizá te has equivocado de pasillo —
          vuelve al hall y empezamos de nuevo, o pásate por una de estas salas.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">
            Volver al inicio
          </Link>
          <Link href="/salas" className="btn-ghost">
            Ver todas las salas
          </Link>
        </div>
      </div>

      <div className="mt-20">
        <h2 className="font-display text-2xl tracking-tight">Quizá buscabas alguna de estas</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {featured.map((r) => (
            <Link
              key={r.slug}
              href={`/salas/${r.slug}`}
              className="group overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] transition hover:border-[var(--color-ink)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-paper-2)]">
                <Image
                  src={r.image}
                  alt={`${r.name} — ${r.subtitle}`}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5">
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
                  {r.subtitle}
                </div>
                <div className="mt-2 font-display text-lg tracking-tight">{r.name}</div>
                <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-mute)] group-hover:text-[var(--color-ink)]">
                  Ver detalle <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
