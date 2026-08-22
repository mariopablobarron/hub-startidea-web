import type { Metadata } from "next";
import { CapsulaExperience } from "./CapsulaExperience";
import { requireAdmin } from "@/lib/auth/roles";
import { normalizeCapsulaSala } from "@/lib/capsula/capability";

export const metadata: Metadata = {
  title: "Cápsula del Tiempo · Experiencia VR",
  description: "Viaje inmersivo del programa Cápsula del Tiempo del HUB Startidea.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ host?: string; sala?: string; sesion?: string }>;
};

/**
 * /capsula — experiencia WebXR para el programa "Cápsula del Tiempo".
 *
 * Modos (misma URL, distinto query):
 *  - /capsula            → INVITADO (gafas): ve el viaje 360 + recibe la
 *    voz del entrevistador.
 *  - /capsula?host=1     → ENTREVISTADOR (Mario): controla el destino y
 *    habla al invitado por audio. (También ve la escena.)
 *  - ?sala=xxx           → código de sala compartido entre ambos lados
 *    (default "estudio"). Mismo código en los dos dispositivos.
 *
 * El audio es WebRTC P2P (no toca el VPS). Sirve en remoto y presencial.
 */
export default async function CapsulaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const isHost = sp.host === "1";
  const sala = normalizeCapsulaSala(sp.sala || "estudio") || "estudio";
  const sesionId = sp.sesion || null;

  if (isHost) {
    const query = new URLSearchParams({ host: "1", sala });
    if (sesionId) query.set("sesion", sesionId);
    await requireAdmin(`/capsula?${query.toString()}`);
  }

  return <CapsulaExperience sala={sala} isHost={isHost} sesionId={sesionId} />;
}
