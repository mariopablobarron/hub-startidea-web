"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { DESTINOS, destinoById } from "./destinos";

/**
 * Escena WebXR de la Cápsula del Tiempo. Es un componente CONTROLADO: el
 * ambiente activo (`activeId`) y su cambio (`onSelect`) viven en el padre
 * (CapsulaExperience), para que el panel del entrevistador pueda cambiar el
 * ambiente además del selector de arriba.
 */
export function CapsulaScene({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const skyRef = useRef<HTMLElement | null>(null);
  const wordRef = useRef<HTMLElement | null>(null);
  const active = destinoById(activeId);

  // Aplicar el destino activo a los elementos A-Frame de forma imperativa
  // (setAttribute) — más robusto que props de React sobre custom elements.
  useEffect(() => {
    if (!ready) return;
    const sky = skyRef.current;
    const word = wordRef.current;
    if (sky) {
      if (active.image) {
        sky.setAttribute("src", active.image);
        sky.setAttribute("color", "#FFF");
      } else {
        sky.removeAttribute("src");
        sky.setAttribute("color", active.color);
      }
    }
    if (word) {
      word.setAttribute("value", active.word);
      word.setAttribute("color", active.accent);
    }
  }, [active, ready]);

  return (
    <>
      <Script
        src="https://aframe.io/releases/1.5.0/aframe.min.js"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />

      {/* Selector de destino (overlay 2D, fuera de la escena VR) */}
      <div className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center gap-2 bg-black/60 p-3 backdrop-blur">
        <span className="mr-2 text-sm font-medium text-white/90">Cápsula del Tiempo · destino:</span>
        {DESTINOS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              active.id === d.id
                ? "bg-white text-black"
                : "bg-white/15 text-white hover:bg-white/30"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Escena WebXR. A-Frame la "hidrata" al cargar el script. */}
      <div className="fixed inset-0" aria-hidden>

        <a-scene embedded vr-mode-ui="enterVRButton: #vrbtn" style={{ width: "100vw", height: "100vh" }}>

          <a-sky ref={skyRef} color={active.color} />
          {/* Palabra flotante delante del usuario */}

          <a-text
            ref={wordRef}
            value={active.word}
            color={active.accent}
            position="0 1.6 -3"
            align="center"
            width="6"
            font="kelsonsans"
          />

          <a-camera wasd-controls-enabled="false" />
        </a-scene>
      </div>

      {/* Botón VR custom (A-Frame engancha enterVRButton: #vrbtn) */}
      <button
        id="vrbtn"
        className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg"
      >
        🥽 Entrar en VR
      </button>

      <p className="fixed bottom-5 right-4 z-50 max-w-[40vw] text-right text-[11px] text-white/70">
        En la Quest: pulsa &ldquo;Entrar en VR&rdquo;. En móvil/PC: arrastra para mirar
        alrededor.
      </p>
    </>
  );
}
