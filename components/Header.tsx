"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { content } from "@/lib/content";

const site = content.site;

const nav = [
  { href: "/ecosistema", label: "Ecosistema" },
  { href: "/salas", label: "Salas" },
  { href: "/eventos", label: "Eventos" },
  { href: "/metodo", label: "Método" },
  { href: "/#podcast", label: "Podcast" },
  // Consolidado al Telar (comunidad.hubstartidea.es): la "Comunidad" pública del
  // HUB es la plataforma online; el foro interno /comunidad sigue existiendo pero
  // ya no se enlaza desde la navegación pública.
  { href: "https://comunidad.hubstartidea.es", label: "Comunidad" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cerrar menú móvil al pulsar Escape + bloquear scroll del body cuando está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-[var(--color-paper)]/80 backdrop-blur-md shadow-[0_1px_0_var(--color-line)]"
          : "bg-transparent",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between">
        {/*
          Wordmark del Manual de Identidad Startidea — "startidea." en
          Montserrat Alternates con punto magenta corporativo. El HUB
          hereda la marca matriz (no logotipo propio, sigue la regla del
          manual para iniciativas sin marca independiente).
        */}
        <Link
          href="/"
          aria-label={`${site.name} — inicio`}
          className="group inline-flex items-baseline font-display text-xl tracking-tight"
        >
          <span className="text-[var(--color-ink)]">startidea</span>
          <span className="text-[var(--color-coral-500)] transition group-hover:text-[var(--color-coral-600)]">.</span>
          <span className="ml-3 hidden text-xs uppercase tracking-[0.18em] text-[var(--color-mute)] md:inline-block">
            HUB · Granada
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[var(--color-ink)]/80 transition hover:text-[var(--color-coral-600)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/reservar" className="hidden md:inline-flex btn-primary">
          Reservar sala
        </Link>

        <button
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          className="md:hidden grid h-10 w-10 place-items-center rounded-full border border-[var(--color-line)]"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--color-line)] bg-[var(--color-paper)]">
          <div className="container-page flex flex-col gap-4 py-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-base text-[var(--color-ink)]"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/reservar" onClick={() => setOpen(false)} className="btn-primary mt-2 self-start">
              Reservar sala
            </Link>
            {/*
              Link a /login funciona también para usuarios logueados: el
              middleware (auth.config.ts) detecta sesión activa y redirige
              a /me o /admin automáticamente, así no necesitamos saber el
              estado de sesión en este Client Component (evita SessionProvider).
            */}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-ink)] hover:border-[var(--color-ink)]"
            >
              Entrar al HUB
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
