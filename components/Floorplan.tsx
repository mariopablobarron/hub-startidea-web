"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Users, Maximize2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { rooms, type Room } from "@/lib/data/rooms";
import { cn } from "@/lib/cn";

/**
 * Plano esquemático del HUB. Las coordenadas son simbólicas (no a escala
 * arquitectónica) pero respetan la topología real del local: entrada a la
 * izquierda, calle Conde Cifuentes en la parte sur, aulas grandes al norte y
 * sur, zona común en el centro.
 */

type Region = {
  slug?: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  variant?: "room" | "common" | "service";
};

const VB_W = 760;
const VB_H = 1000;

const regions: Region[] = [
  // Norte (zona alejada de la calle)
  { slug: "cc33", label: "CC33 · Aula 6", x: 30, y: 30, w: 280, h: 230 },
  { label: "Aula 4", x: 320, y: 30, w: 90, h: 100, variant: "room" },
  { slug: "estudio-podcast", label: "Estudio · Aula 5", x: 320, y: 140, w: 90, h: 120 },
  { label: "Pasillo 2", x: 420, y: 30, w: 110, h: 230, variant: "common" },
  { label: "Vest./Aseo", x: 540, y: 30, w: 70, h: 100, variant: "service" },
  { label: "Dirección", x: 540, y: 140, w: 70, h: 120, variant: "service" },
  { slug: "serendipia", label: "Serendipia · Biblioteca", x: 620, y: 30, w: 110, h: 320 },

  // Centro
  { label: "Sala máquinas", x: 30, y: 280, w: 100, h: 130, variant: "service" },
  { label: "Recepción", x: 140, y: 280, w: 130, h: 130, variant: "common" },
  { label: "Hall", x: 280, y: 280, w: 240, h: 130, variant: "common" },
  { label: "Pasillo 1", x: 530, y: 360, w: 100, h: 50, variant: "common" },

  // Centro-derecha (Aula 3)
  { slug: "aula-3", label: "Aula 3", x: 530, y: 420, w: 200, h: 180 },

  // Sala profesores (office privado)
  { slug: "office-privado", label: "Office privado", x: 530, y: 610, w: 200, h: 130 },

  // Sur (cerca de la calle)
  { slug: "aula-1", label: "Aula 1", x: 30, y: 430, w: 260, h: 320 },
  { slug: "socrates", label: "Sócrates · Aula 2", x: 300, y: 430, w: 220, h: 320 },

  // Coworking abierto: zona pasillo central + hall
  { slug: "coworking-open", label: "Coworking", x: 30, y: 770, w: 700, h: 90 },
];

export function Floorplan() {
  const [active, setActive] = useState<Room | null>(null);

  return (
    <section id="tour" className="bg-[var(--color-paper-2)] py-24 md:py-32">
      <div className="container-page">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">Tour del local</span>
            <h2 className="mt-4 max-w-2xl text-4xl tracking-tight md:text-5xl">
              Pasa por cada sala sin moverte de la silla.
            </h2>
          </div>
          <p className="max-w-md text-[var(--color-mute)]">
            Toca cualquier zona del plano para ver su tamaño, capacidad y
            equipamiento. ¿Prefieres venir? Acércate a saludar y te lo
            enseñamos en directo.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Plano */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-soft)]">
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              role="img"
              aria-label="Plano interactivo del HUB Startidea"
              className="h-auto w-full"
            >
              {/* Contorno general del local */}
              <rect
                x="14"
                y="14"
                width={VB_W - 28}
                height={VB_H - 28}
                rx="20"
                fill="none"
                stroke="var(--color-line)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />

              {/* Etiqueta calle */}
              <text
                x={VB_W / 2}
                y={VB_H - 4}
                textAnchor="middle"
                fontSize="14"
                fill="var(--color-mute)"
                fontFamily="var(--font-fraunces)"
                fontStyle="italic"
              >
                C/ Conde Cifuentes
              </text>

              {/* Flecha de entrada */}
              <g transform="translate(2, 480)">
                <text fontSize="11" fill="var(--color-coral-600)" fontWeight="600">
                  ENTRADA
                </text>
                <text x="0" y="14" fontSize="14" fill="var(--color-coral-500)">
                  →
                </text>
              </g>

              {regions.map((r, i) => {
                const room = r.slug ? rooms.find((x) => x.slug === r.slug) : undefined;
                const isInteractive = !!room;
                const isActive = active?.slug === r.slug;

                return (
                  <g
                    key={i}
                    onClick={() => room && setActive(room)}
                    onMouseEnter={() => room && setActive(room)}
                    className={cn(
                      "transition",
                      isInteractive && "cursor-pointer",
                    )}
                  >
                    <rect
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      rx="10"
                      fill={
                        isActive
                          ? "var(--color-coral-500)"
                          : r.variant === "common"
                          ? "var(--color-paper-2)"
                          : r.variant === "service"
                          ? "#ece6d8"
                          : isInteractive
                          ? "white"
                          : "#f5f1e7"
                      }
                      stroke={
                        isActive ? "var(--color-coral-700)" : "var(--color-line)"
                      }
                      strokeWidth={isActive ? "2" : "1"}
                      style={
                        isInteractive && !isActive
                          ? {
                              filter:
                                "drop-shadow(0 2px 0 rgba(10,10,11,.04))",
                            }
                          : undefined
                      }
                    />
                    <text
                      x={r.x + r.w / 2}
                      y={r.y + r.h / 2 + 4}
                      textAnchor="middle"
                      fontSize={r.w < 110 ? "10" : "13"}
                      fontWeight={isInteractive ? "600" : "500"}
                      fill={
                        isActive
                          ? "white"
                          : isInteractive
                          ? "var(--color-ink)"
                          : "var(--color-mute)"
                      }
                      fontFamily="var(--font-inter)"
                    >
                      {r.label}
                    </text>
                    {room && (
                      <text
                        x={r.x + r.w / 2}
                        y={r.y + r.h / 2 + 22}
                        textAnchor="middle"
                        fontSize="11"
                        fill={isActive ? "white" : "var(--color-mute)"}
                      >
                        {room.area} m²
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-xs text-[var(--color-mute)]">
              <LegendDot color="white" border>Sala disponible</LegendDot>
              <LegendDot color="#ece6d8">Servicios</LegendDot>
              <LegendDot color="var(--color-paper-2)">Zona común</LegendDot>
              <span className="ml-auto">Pasa el ratón sobre cada sala</span>
            </div>
          </div>

          {/* Panel info */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {active ? (
              <motion.div
                key={active.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] shadow-[var(--shadow-soft)]"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-paper-2)]">
                  <Image
                    src={active.image}
                    alt={`${active.name} — ${active.subtitle}`}
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                  />
                  {active.highlight && (
                    <span className="absolute left-5 top-5 rounded-full bg-[var(--color-coral-500)] px-3 py-1 text-xs font-medium text-white shadow-sm">
                      {active.highlight}
                    </span>
                  )}
                </div>
                <div className="p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-coral-600)]">
                      {active.subtitle}
                    </div>
                    <h3 className="mt-2 font-display text-3xl tracking-tight">
                      {active.name}
                    </h3>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <Spec icon={<Maximize2 size={14} />} label="Superficie">
                    {active.area} m²
                  </Spec>
                  <Spec icon={<Users size={14} />} label="Capacidad">
                    hasta {Math.max(active.capacity.school, active.capacity.theater, active.capacity.coctel ?? 0, active.capacity.boardroom ?? 0)} pers.
                  </Spec>
                </div>

                <p className="mt-6 text-sm text-[var(--color-mute)]">{active.description}</p>

                <div className="mt-6">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">Equipamiento</div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {active.equipment.map((e) => (
                      <li key={e} className="rounded-full bg-[var(--color-paper-2)] px-3 py-1 text-xs">
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link href={`/salas/${active.slug}`} className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-coral-600)] hover:text-[var(--color-coral-700)]">
                  Ver detalle de {active.name}
                  <ArrowRight size={14} />
                </Link>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[var(--color-line)] bg-transparent p-8">
                <h3 className="font-display text-2xl">Pasa el ratón por una sala</h3>
                <p className="mt-3 text-sm text-[var(--color-mute)]">
                  Cada zona del plano muestra sus metros, su capacidad y para
                  qué se suele usar. La entrada está en el lateral izquierdo
                  (C/ Conde Cifuentes).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Spec({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-mute)]">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-xl tracking-tight">{children}</div>
    </div>
  );
}

function LegendDot({
  color,
  border,
  children,
}: {
  color: string;
  border?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded"
        style={{
          background: color,
          border: border ? "1px solid var(--color-line)" : undefined,
        }}
      />
      {children}
    </span>
  );
}
