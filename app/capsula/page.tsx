import type { Metadata } from "next";
import { CapsulaScene } from "./CapsulaScene";

export const metadata: Metadata = {
  title: "Cápsula del Tiempo · Experiencia VR",
  description: "Viaje inmersivo del programa Cápsula del Tiempo del HUB Startidea.",
  // No indexable: es una herramienta interna del programa, no contenido SEO.
  robots: { index: false, follow: false },
};

/**
 * /capsula — experiencia WebXR para el programa de radio "Cápsula del
 * Tiempo". El invitado se pone las Meta Quest, abre esta URL y "viaja"
 * a un ambiente evocador (Granada, infancia, verano, abrazo, símbolos…)
 * mientras se le entrevista.
 *
 * Funciona en 3 modos sin cambios:
 *  - Quest / VR: botón "Entrar en VR" (WebXR nativo del navegador Quest)
 *  - Móvil: girar el teléfono / arrastrar
 *  - PC: arrastrar con el ratón
 *
 * Contenido: cada "destino" es de momento una ATMÓSFERA DE COLOR 360 con
 * su palabra flotante — funciona sin archivos pesados. Cuando haya fotos
 * 360 equirectangulares reales (capturadas con la Quest o un móvil 360),
 * se añade el campo `image` a la escena y reemplaza al color, sin tocar
 * más código.
 */
export default function CapsulaPage() {
  return <CapsulaScene />;
}
