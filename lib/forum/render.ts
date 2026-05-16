import type { TopicCategory } from "@prisma/client";

/**
 * Helpers de render del foro — etiquetas + colores por categoría +
 * sanitización mínima para mostrar body como texto plano con saltos
 * de línea (no permitimos HTML libre en el foro para evitar XSS).
 */

export const CATEGORY_LABEL: Record<TopicCategory, string> = {
  GENERAL: "General",
  ANUNCIOS: "Anuncios",
  PROYECTOS: "Proyectos",
  EVENTOS: "Eventos",
  COWORKING: "Coworking",
  AYUDA: "Ayuda",
};

export const CATEGORY_COLOR: Record<TopicCategory, string> = {
  GENERAL: "bg-gray-100 text-gray-700",
  ANUNCIOS: "bg-[var(--color-coral-100)] text-[var(--color-coral-700)]",
  PROYECTOS: "bg-blue-50 text-blue-700",
  EVENTOS: "bg-amber-50 text-amber-700",
  COWORKING: "bg-emerald-50 text-emerald-700",
  AYUDA: "bg-purple-50 text-purple-700",
};

export const CATEGORIES: TopicCategory[] = [
  "GENERAL",
  "ANUNCIOS",
  "PROYECTOS",
  "EVENTOS",
  "COWORKING",
  "AYUDA",
];

/** Acorta texto preservando palabras. */
export function excerpt(text: string, max = 200): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";
}

/** Tiempo relativo en español, simple. */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "ahora mismo";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} m`;
  const years = Math.floor(months / 12);
  return `hace ${years} año${years === 1 ? "" : "s"}`;
}
