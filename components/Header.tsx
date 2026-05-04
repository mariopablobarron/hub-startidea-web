"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { content } from "@/lib/content";

const site = content.site;

const nav = [
  { href: "/#salas", label: "Salas" },
  { href: "/#tour", label: "Tour" },
  { href: "/#podcast", label: "Podcast" },
  { href: "/#formacion", label: "Formación" },
  { href: "/#comunidad", label: "Comunidad" },
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
        <Link href="/" className="group flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-ink)] text-[var(--color-paper)] transition group-hover:bg-[var(--color-coral-500)]">
            H
          </span>
          <span>{site.name}</span>
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

        <Link href="/#contacto" className="hidden md:inline-flex btn-primary">
          Reservar visita
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
            <Link href="/#contacto" onClick={() => setOpen(false)} className="btn-primary mt-2 self-start">
              Reservar visita
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
