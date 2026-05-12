import Link from "next/link";
import { Instagram, Facebook, Phone, Mail, MapPin, ArrowUpRight } from "lucide-react";
import { content } from "@/lib/content";

const site = content.site;
const ecosystemProjects = content.ecosystem.projects;

export function Footer() {
  return (
    <footer className="mt-32 bg-[var(--color-ink)] text-[var(--color-paper)]">
      {/* Cinta superior con proyectos del ecosistema Startidea */}
      <div className="border-b border-white/10">
        <div className="container-page py-10">
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-paper)]/55">
              El HUB forma parte de
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {ecosystemProjects.map((p) => (
                <li key={p.url}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[var(--color-paper)]/85 transition hover:text-[var(--color-coral-500)]"
                  >
                    {p.name}
                    <ArrowUpRight size={12} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="container-page grid gap-12 py-20 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="font-display text-3xl tracking-tight">{site.name}</div>
          <p className="mt-4 max-w-sm text-[var(--color-paper)]/70">
            Coworking, salas de formación y estudio de podcast en el centro de Granada.
            Donde se cocinan los proyectos con propósito.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href={site.social.instagram}
              aria-label="Instagram"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-[var(--color-coral-500)] hover:text-[var(--color-coral-500)]"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Instagram size={16} />
            </Link>
            <Link
              href={site.social.facebook}
              aria-label="Facebook"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-[var(--color-coral-500)] hover:text-[var(--color-coral-500)]"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Facebook size={16} />
            </Link>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-paper)]/50">Visítanos</div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--color-coral-500)]" />
              <span>
                {site.address.street}
                <br />
                {site.address.postal} {site.address.city}
              </span>
            </li>
            <li className="flex gap-3">
              <Phone size={16} className="mt-0.5 shrink-0 text-[var(--color-coral-500)]" />
              <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="hover:text-[var(--color-coral-500)]">
                {site.phoneDisplay}
              </a>
            </li>
            <li className="flex gap-3">
              <Mail size={16} className="mt-0.5 shrink-0 text-[var(--color-coral-500)]" />
              <a href={`mailto:${site.email}`} className="hover:text-[var(--color-coral-500)]">
                {site.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-paper)]/50">Enlaces</div>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link href="/#salas" className="hover:text-[var(--color-coral-500)]">Salas</Link></li>
            <li><Link href="/#tour" className="hover:text-[var(--color-coral-500)]">Tour del local</Link></li>
            <li><Link href="/#podcast" className="hover:text-[var(--color-coral-500)]">Estudio podcast</Link></li>
            <li><Link href="/#ecosistema" className="hover:text-[var(--color-coral-500)]">Ecosistema</Link></li>
            <li>
              <a href={site.parent.url} target="_blank" rel="noreferrer noopener" className="hover:text-[var(--color-coral-500)]">
                {site.parent.name} ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-start justify-between gap-4 py-6 text-xs text-[var(--color-paper)]/50 md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} {site.parent.name}. Todos los derechos reservados.</div>
          <div className="flex gap-6">
            <Link href="/aviso-legal" className="hover:text-[var(--color-paper)]">Aviso legal</Link>
            <Link href="/privacidad" className="hover:text-[var(--color-paper)]">Privacidad</Link>
            <Link href="/cookies" className="hover:text-[var(--color-paper)]">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
