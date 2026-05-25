"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";

/**
 * Widget de voz de ElevenLabs Conversational AI.
 *
 * Activación condicional: solo se monta si NEXT_PUBLIC_ELEVENLABS_AGENT_ID
 * está definido. Esto permite mergear/deployar sin tener el agente listo;
 * cuando Mario crea el agente y añade la env var en Coolify, el widget
 * aparece en el siguiente deploy.
 *
 * Convive con ChatWidget (texto). El usuario puede usar el que prefiera.
 *
 * ElevenLabs sirve un Web Component <elevenlabs-convai> via su CDN.
 * Lo cargamos como <script> diferido para no penalizar el LCP.
 *
 * Posicionamiento en pantalla:
 * - Desktop: arriba del ChatWidget (bottom-24) para no solapar
 * - Mobile: encima del ChatWidget también, pero más compacto
 *
 * El widget de ElevenLabs renderiza su propio botón "speak"; aquí solo
 * lo encapsulamos para controlar visibilidad y posición.
 */
export function VoiceWidget() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!agentId) return;
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
  }, [agentId]);

  if (!agentId) {
    return null;
  }

  return (
    <>
      {/* Posicionado encima del ChatWidget (que está en bottom-5 right-5) */}
      <div
        className="fixed bottom-24 right-5 z-50"
        aria-label="Asistente de voz HUB Startidea"
      >
        {scriptReady ? (
          // @ts-expect-error — custom element de ElevenLabs
          <elevenlabs-convai agent-id={agentId} />
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
