"use client";

import { useState } from "react";
import { CapsulaScene } from "./CapsulaScene";
import { CapsulaAudio } from "./CapsulaAudio";
import { CapsulaCopiloto } from "./CapsulaCopiloto";
import { CapsulaSpotify } from "./CapsulaSpotify";
import { DESTINOS } from "./destinos";

/**
 * Une la escena 360 y el panel del entrevistador bajo un mismo estado: el
 * ambiente activo. Así el ambiente se puede cambiar desde el selector de
 * arriba (escena) O desde el panel del entrevistador (botones de ambiente y
 * salto automático al elegir modo), y ambos quedan sincronizados.
 */
export function CapsulaExperience({
  sala,
  isHost,
  sesionId,
}: {
  sala: string;
  isHost: boolean;
  sesionId?: string | null;
}) {
  const [activeId, setActiveId] = useState(DESTINOS[0].id);
  return (
    <>
      <CapsulaScene activeId={activeId} onSelect={setActiveId} />
      <CapsulaAudio
        sala={sala}
        isHost={isHost}
        activeId={activeId}
        onSelect={setActiveId}
        sesionId={sesionId}
      />
      {isHost && sesionId && <CapsulaCopiloto sesionId={sesionId} />}
      {isHost && <CapsulaSpotify />}
    </>
  );
}
