"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Mic, MicOff, PhoneCall, Loader2 } from "lucide-react";

/**
 * Canal de audio en tiempo real para la entrevista, sobre WebRTC P2P
 * (PeerJS). El audio viaja DIRECTO entre los dos navegadores — no toca
 * el VPS del HUB (que está saturado); solo se usa un broker público de
 * señalización para que ambos peers se encuentren.
 *
 * Dos roles, misma URL:
 *  - Invitado (las Meta Quest, modo normal): registra un peer-id estable
 *    `capsula-<sala>-invitado`, espera la llamada y reproduce la voz del
 *    entrevistador por los altavoces de las gafas.
 *  - Entrevistador (Mario, abre /capsula?host=1): llama a ese peer-id y
 *    envía su micro. También oye al invitado (bidireccional).
 *
 * Funciona en remoto (cada uno en su sitio) y en presencial (el invitado
 * con auriculares/gafas para que no se acople con el micro del estudio).
 *
 * Sala configurable con ?sala=xxx (default "estudio") por si grabas
 * varios a la vez o quieres un código privado.
 */

type Status = "idle" | "connecting" | "live" | "error";

declare global {
  interface Window {
    Peer?: new (id?: string, opts?: unknown) => PeerInstance;
  }
}
type PeerCall = {
  answer: (stream?: MediaStream) => void;
  on: (ev: string, cb: (arg: MediaStream) => void) => void;
};
type PeerInstance = {
  on: (ev: string, cb: (arg: unknown) => void) => void;
  call: (id: string, stream: MediaStream) => PeerCall;
  destroy: () => void;
};

export function CapsulaAudio({ sala = "estudio", isHost }: { sala?: string; isHost: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scriptReady = useRef(false);

  const guestId = `capsula-${sala}-invitado`;

  function playRemote(stream: MediaStream) {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
    setStatus("live");
  }

  async function connect() {
    setErr(null);
    setStatus("connecting");
    try {
      if (!window.Peer) throw new Error("Librería de audio no cargada todavía, reintenta en 2s.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      if (isHost) {
        // Entrevistador: id aleatorio, llama al invitado.
        const peer = new window.Peer(undefined, { debug: 1 });
        peerRef.current = peer;
        peer.on("open", () => {
          const call = peer.call(guestId, stream);
          call.on("stream", (remote: MediaStream) => playRemote(remote));
          // Si el invitado aún no está, reintentar la llamada unos segundos.
          let tries = 0;
          const retry = setInterval(() => {
            if (status === "live" || tries++ > 10) return clearInterval(retry);
            const c = peer.call(guestId, stream);
            c.on("stream", (remote: MediaStream) => { clearInterval(retry); playRemote(remote); });
          }, 3000);
        });
        peer.on("error", (e: unknown) => {
          setErr("No se pudo conectar con el invitado. ¿Ha pulsado 'Conectar audio' en las gafas?");
          setStatus("error");
          console.error("[capsula-audio] host error", e);
        });
      } else {
        // Invitado: id estable, responde la llamada del entrevistador.
        const peer = new window.Peer(guestId, { debug: 1 });
        peerRef.current = peer;
        peer.on("open", () => setStatus("connecting"));
        peer.on("call", (call: unknown) => {
          const c = call as PeerCall;
          c.answer(stream); // envía mi micro
          c.on("stream", (remote: MediaStream) => playRemote(remote));
        });
        peer.on("error", (e: unknown) => {
          // id-taken: ya hay un invitado en esta sala
          setErr("Ya hay alguien conectado como invitado en esta sala, o error de red.");
          setStatus("error");
          console.error("[capsula-audio] guest error", e);
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo acceder al micrófono.");
      setStatus("error");
    }
  }

  function toggleMute() {
    const s = localStreamRef.current;
    if (!s) return;
    const next = !muted;
    s.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.destroy();
    };
  }, []);

  return (
    <>
      <Script
        src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"
        strategy="afterInteractive"
        onLoad={() => { scriptReady.current = true; }}
      />
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
        {status === "idle" && (
          <button
            type="button"
            onClick={connect}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-coral-500,#e63e73)] px-5 py-3 text-sm font-semibold text-white shadow-lg"
          >
            <PhoneCall size={16} /> Conectar audio {isHost ? "(entrevistador)" : ""}
          </button>
        )}
        {status === "connecting" && (
          <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-5 py-3 text-sm font-medium text-white">
            <Loader2 size={16} className="animate-spin" />
            {isHost ? "Llamando al invitado…" : "Esperando al entrevistador…"}
          </div>
        )}
        {status === "live" && (
          <button
            type="button"
            onClick={toggleMute}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${
              muted ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
            {muted ? "Micro silenciado" : "Audio en directo"}
          </button>
        )}
        {status === "error" && (
          <div className="max-w-xs rounded-2xl bg-red-600 px-4 py-3 text-center text-xs font-medium text-white">
            {err}
            <button onClick={connect} className="mt-1 block w-full underline">Reintentar</button>
          </div>
        )}
      </div>
    </>
  );
}
