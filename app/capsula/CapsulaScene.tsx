"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

/**
 * Cada destino del viaje. `color` = atmósfera de fondo 360 (gradiente
 * sólido). `image` (opcional) = foto 360 equirectangular real; si está,
 * manda sobre el color. `word` = palabra que flota en el espacio.
 */
type Destino = {
  id: string;
  label: string;
  word: string;
  color: string;
  accent: string;
  image?: string; // /images/capsula/<id>.jpg cuando exista
};

// Biblioteca de destinos del programa (brief de Mario: Granada, infancia,
// verano, generales, abrazo, símbolos — ambientes SIN personas para que
// el invitado proyecte su propio recuerdo).
const DESTINOS: Destino[] = [
  { id: "granada", label: "Granada", word: "Granada", color: "#7c3a2d", accent: "#e9b384" },
  { id: "infancia", label: "Infancia", word: "Infancia", color: "#3b6ea5", accent: "#bfe1ff" },
  { id: "verano", label: "Verano", word: "Verano", color: "#c98a1a", accent: "#ffe9a8" },
  { id: "general", label: "Recuerdo", word: "Recuerda", color: "#4a4a5e", accent: "#cfcfe6" },
  { id: "abrazo", label: "Abrazo", word: "Abrazo", color: "#9c3a5a", accent: "#ffc8d8" },
  { id: "simbolos", label: "Símbolos", word: "∞", color: "#2f3a52", accent: "#9fb4e0" },
];

export function CapsulaScene() {
  const [active, setActive] = useState<Destino>(DESTINOS[0]);
  const [ready, setReady] = useState(false);
  const skyRef = useRef<HTMLElement | null>(null);
  const wordRef = useRef<HTMLElement | null>(null);

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
            onClick={() => setActive(d)}
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

          <a-sky ref={skyRef} color={DESTINOS[0].color} />
          {/* Palabra flotante delante del usuario */}

          <a-text
            ref={wordRef}
            value={DESTINOS[0].word}
            color={DESTINOS[0].accent}
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
