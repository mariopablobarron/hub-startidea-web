# HUB Startidea — web pública

Web del coworking **HUB Startidea** en C/ Conde Cifuentes, 33 (Granada).
Sustituye al WordPress actual de `hubstartidea.es`.

> Stack: Next.js 15 · React 19 · TypeScript · Tailwind 4 · Framer Motion · Coolify

## Desarrollo local

```bash
pnpm install
pnpm dev
```

Disponible en http://localhost:3000.

## Estructura

```
app/                  Next.js App Router
  page.tsx            Home (hero + grid + plano + servicios + podcast + comunidad + contacto)
  salas/page.tsx      Catálogo de salas
  salas/[slug]/       Detalle de cada sala
  layout.tsx          Layout raíz + metadata + fuentes
  globals.css         Tailwind 4 + tokens de diseño
components/           UI específica
  Hero.tsx            Hero animado tipo agencia
  Floorplan.tsx       Plano SVG interactivo del local
  RoomsGrid.tsx       Grid de salas destacadas
  Services.tsx        Servicios + amenities (marquee)
  Podcast.tsx         Sección estudio podcast (con waveform animado)
  Community.tsx       Pilares de comunidad
  Contact.tsx         CTA final con datos de contacto
  Header.tsx · Footer.tsx
lib/
  cn.ts               clsx + tailwind-merge
  site.ts             Metadatos del sitio (nombre, dirección, teléfono…)
  data/rooms.ts       Catálogo de salas (m², capacidad, equipamiento)
  data/services.ts    Servicios principales + amenities
public/
  images/             Fotos de salas, equipo, eventos (pendiente)
  floorplan/          Plano original (referencia)
Dockerfile            Build standalone para Coolify
```

## Despliegue en Coolify

1. **Push a GitHub.** El repo se llama `hub-startidea-web`.
2. **En Coolify**, crear nueva *Application* → *Public repository* → URL del repo.
3. *Build Pack* → **Dockerfile** (no Nixpacks, mejor controlado).
4. *Port* → `3000`.
5. *Domains* → `hubstartidea.es` + `www.hubstartidea.es`.
6. Variables de entorno (ver `.env.example`).
7. **Force Redeploy.**

Tras el primer deploy, en IONOS apuntar `hubstartidea.es` al VPS Coolify
(`72.61.195.108`) y esperar propagación DNS.

## Pendientes / siguiente fase

- [ ] **Fotos reales** del local para cada sala (`public/images/rooms/<slug>.jpg`).
- [ ] Confirmar mapping de nombres comerciales (CC33, Serendipia, Sócrates) con las aulas físicas del plano.
- [ ] Confirmar capacidades reales con el equipo Startidea.
- [ ] Página `/podcast` extendida con episodios de Granada Social.
- [ ] Página `/eventos` con próximas convocatorias.
- [ ] Formulario de reserva (Resend + endpoint API).
- [ ] **Tour fase 2** — incrustar fotos 360 en cada sala (visor pannellum).
- [ ] Aviso legal, política de privacidad y cookies (textos pendientes).
- [ ] Schema.org `LocalBusiness` para SEO local.

## Licencia

Privado — © Startidea, Agencia de Innovación Social.
