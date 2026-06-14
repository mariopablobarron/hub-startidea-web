/**
 * Destinos (ambientes 360) de la Cápsula del Tiempo.
 *
 * `color` = atmósfera de fondo 360 (gradiente sólido). `image` (opcional) =
 * foto 360 equirectangular real en /images/capsula/<id>.jpg; si está, manda
 * sobre el color. `word` = palabra que flota en el espacio.
 *
 * Brief de Mario: Granada, infancia, verano, generales, abrazo, símbolos —
 * ambientes SIN personas para que el invitado proyecte su propio recuerdo.
 *
 * Compartido por CapsulaScene (lo pinta) y CapsulaAudio (botones de ambiente
 * en el panel del entrevistador). Los modos en modos.ts referencian estos ids.
 */
export type Destino = {
  id: string;
  label: string;
  word: string;
  color: string;
  accent: string;
  image?: string;
};

export const DESTINOS: Destino[] = [
  { id: "granada", label: "Granada", word: "Granada", color: "#7c3a2d", accent: "#e9b384" },
  { id: "infancia", label: "Infancia", word: "Infancia", color: "#3b6ea5", accent: "#bfe1ff" },
  { id: "verano", label: "Verano", word: "Verano", color: "#c98a1a", accent: "#ffe9a8" },
  { id: "general", label: "Recuerdo", word: "Recuerda", color: "#4a4a5e", accent: "#cfcfe6" },
  { id: "abrazo", label: "Abrazo", word: "Abrazo", color: "#9c3a5a", accent: "#ffc8d8" },
  { id: "simbolos", label: "Símbolos", word: "∞", color: "#2f3a52", accent: "#9fb4e0" },
];

export const destinoById = (id: string): Destino =>
  DESTINOS.find((d) => d.id === id) || DESTINOS[0];
