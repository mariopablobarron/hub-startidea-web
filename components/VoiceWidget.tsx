"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

/**
 * Widget de voz de ElevenLabs Conversational AI.
 *
 * NOTA: el agent_id está hardcoded porque es público (se sirve en HTML
 * de todas formas en el atributo agent-id del custom element). Coolify
 * v3 buildPack=docker NO pasa los Secrets isBuildSecret=1 como
 * --build-arg al docker buildx, así que el patrón NEXT_PUBLIC_* + ENV
 * en Dockerfile no funciona. Para rotar agente: editar la constante
 * AGENT_ID, commit, redeploy.
 *
 * Si en el futuro quieres MÚLTIPLES agentes (ej. uno por tenant), refactor
 * a leer agent_id de un endpoint API o de content.json. Pero para el
 * HUB que es un único tenant, hardcoded es lo más simple.
 *
 * El widget convive con ChatWidget (texto). El usuario puede usar el
 * que prefiera. ElevenLabs sirve un Web Component <elevenlabs-convai>
 * via su CDN; lo cargamos diferido para no penalizar el LCP.
 *
 * Posicionado encima del ChatWidget (bottom-24) para no solapar.
 */

// Mario · HUB Startidea · es-andalusian voice clone
const AGENT_ID = "agent_9501kse72fyxevnsk9mseptbtamx";

export function VoiceWidget() {
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (document.querySelector('script[data-elevenlabs-convai]')) {
      setScriptReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    s.async = true;
    s.dataset.elevenlabsConvai = "1";
    s.onload = () => setScriptReady(true);
    document.body.appendChild(s);
  }, []);

  return (
    <>
      {/* Posicionado encima del ChatWidget (que está en bottom-5 right-5) */}
      <div
        className="fixed bottom-24 right-5 z-50"
        aria-label="Asistente de voz HUB Startidea"
      >
        {scriptReady ? (
          // @ts-expect-error — custom element de ElevenLabs
          <elevenlabs-convai agent-id={AGENT_ID} />
        ) : (
          // Placeholder mientras carga el script externo
          <button
            type="button"
            disabled
            className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] opacity-50"
            aria-label="Cargando asistente de voz"
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    </>
  );
}
