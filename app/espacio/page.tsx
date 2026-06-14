import type { Metadata } from "next";
import Link from "next/link";
import { Maximize2, Users, ArrowRight, Sparkles } from "lucide-react";
import { virtualSpace } from "@/lib/content";
import { getCurrentUser } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Espacio virtual · HUB Startidea",
  description:
    "Entra al espacio virtual del HUB: muévete, coincide con la comunidad y habla por proximidad, como si estuvieras en el local.",
  robots: { index: false, follow: false },
};

export default async function EspacioPage() {
  const vs = virtualSpace;
  const user = await getCurrentUser();

  // Gating: si requiere login y no hay sesión → invitar a entrar.
  if (vs.requireLogin && !user) {
    return (
      <Shell>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">{vs.title}</h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-mute)]">
          El espacio virtual es para la comunidad del HUB. Entra con tu cuenta (sin
          contraseña, por email) y accede.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent("/espacio")}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
          >
            Acceder <ArrowRight size={14} />
          </Link>
          <Link
            href="/registro?callbackUrl=/espacio"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-6 py-3 text-sm hover:border-[var(--color-ink)]"
          >
            Crear cuenta
          </Link>
        </div>
      </Shell>
    );
  }

  // No configurado todavía → estado "próximamente".
  if (!vs.enabled || !vs.url) {
    return (
      <Shell>
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-coral-50)] px-3 py-1 text-xs font-medium text-[var(--color-coral-700)]">
          <Sparkles size={13} /> En preparación
        </div>
        <h1 className="mt-4 font-display text-4xl tracking-tight md:text-5xl">{vs.title}</h1>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-mute)]">
          Estamos montando un espacio virtual donde moverte por salas y hablar con la
          comunidad por proximidad — como estar en el local sin estar. Muy pronto.
        </p>
        <p className="mt-3 text-sm text-[var(--color-mute)]">
          ¿Quieres avisar de que te interesa? Escríbenos a{" "}
          <a href="mailto:hola@hubstartidea.es" className="underline">hola@hubstartidea.es</a>.
        </p>
      </Shell>
    );
  }

  // Configurado → embed (si embed=true e iframe permitido) + CTA fullscreen.
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">{vs.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-mute)]">
            <Users size={14} /> Espacio en vivo · habla por proximidad
          </p>
        </div>
        <a
          href={vs.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-medium text-[var(--color-paper)] hover:bg-[var(--color-coral-500)]"
        >
          <Maximize2 size={14} /> Abrir a pantalla completa
        </a>
      </header>

      {vs.embed ? (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-black">
          {/* iframe con permisos cámara/micro. Si la plataforma manda
              X-Frame-Options DENY, el iframe quedará en blanco — por eso
              el CTA "pantalla completa" de arriba SIEMPRE funciona. */}
          <iframe
            src={vs.url}
            title={vs.title}
            className="h-[70vh] w-full"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-12 text-center">
          <Users className="mx-auto text-[var(--color-coral-600)]" size={32} />
          <p className="mt-4 text-[var(--color-mute)]">
            El espacio se abre en una pestaña nueva para mejor rendimiento de vídeo.
          </p>
          <a
            href={vs.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-coral-500)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-coral-700)]"
          >
            Entrar al espacio <ArrowRight size={14} />
          </a>
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--color-mute)]">
        Si la cámara/micro no cargan dentro de la web, usa &ldquo;Abrir a pantalla
        completa&rdquo; — algunas plataformas solo permiten vídeo fuera de un iframe.
      </p>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <div className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-8 md:p-12">
        {children}
      </div>
    </main>
  );
}
