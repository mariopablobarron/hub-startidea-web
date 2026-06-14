"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { Mic, MicOff, PhoneCall, Loader2, Volume2 } from "lucide-react";

/**
 * Audio en tiempo real + TTS para Cápsula del Tiempo, sobre WebRTC P2P
 * (PeerJS). Audio y datos van DIRECTO entre los dos navegadores — no
 * tocan el VPS (saturado); solo broker público de señalización.
 *
 * Dos canales sobre el mismo peer:
 *  - Media (voz en vivo): micro del entrevistador ↔ invitado.
 *  - Datos (TTS): el entrevistador escribe un texto + elige voz; el
 *    invitado recibe la orden, pide el audio a /api/capsula/tts
 *    (ElevenLabs) y lo reproduce por las gafas. Así Mario puede "hablar"
 *    con una voz elegida sin usar la suya — para relajaciones, personajes,
 *    o públicos distintos (joven/mayor).
 *
 * Roles por query: invitado (/capsula) · entrevistador (/capsula?host=1).
 */

type Status = "idle" | "connecting" | "live" | "error";
type Voice = { id: string; name: string; labels: Record<string, string> };

declare global {
  interface Window {
    Peer?: new (id?: string, opts?: unknown) => PeerInstance;
  }
}
type PeerCall = { answer: (s?: MediaStream) => void; on: (ev: string, cb: (a: MediaStream) => void) => void };
type DataConn = { on: (ev: string, cb: (a?: unknown) => void) => void; send: (d: unknown) => void; open?: boolean };
type PeerInstance = {
  on: (ev: string, cb: (arg: unknown) => void) => void;
  call: (id: string, stream: MediaStream) => PeerCall;
  connect: (id: string) => DataConn;
  destroy: () => void;
};

type TtsMsg = { type: "tts"; text: string; voiceId: string };

export function CapsulaAudio({ sala = "estudio", isHost }: { sala?: string; isHost: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const peerRef = useRef<PeerInstance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataConnRef = useRef<DataConn | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const guestId = `capsula-${sala}-invitado`;

  // Reproduce un texto TTS localmente (lo usan host —preview— e invitado).
  const playTts = useCallback(async (text: string, vId: string) => {
    try {
      const res = await fetch("/api/capsula/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: vId }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = url;
        await ttsAudioRef.current.play().catch(() => {});
      }
    } catch { /* silencioso */ }
  }, []);

  function playRemoteVoice(stream: MediaStream) {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.srcObject = stream;
      voiceAudioRef.current.play().catch(() => {});
    }
    setStatus("live");
  }

  // El invitado, al recibir una orden TTS por datos, genera y reproduce.
  const handleData = useCallback((raw: unknown) => {
    const msg = raw as TtsMsg;
    if (msg && msg.type === "tts" && msg.text && msg.voiceId) {
      void playTts(msg.text, msg.voiceId);
    }
  }, [playTts]);

  async function connect() {
    setErr(null);
    setStatus("connecting");
    try {
      if (!window.Peer) throw new Error("Librería de audio aún cargando, reintenta en 2s.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      if (isHost) {
        const peer = new window.Peer(undefined, { debug: 1 });
        peerRef.current = peer;
        peer.on("open", () => {
          // Canal de voz
          const call = peer.call(guestId, stream);
          call.on("stream", (r: MediaStream) => playRemoteVoice(r));
          // Canal de datos (TTS)
          const dc = peer.connect(guestId);
          dc.on("open", () => { dataConnRef.current = dc; });
          // Reintentos por si el invitado conecta después
          let tries = 0;
          const retry = setInterval(() => {
            if (status === "live" || tries++ > 12) return clearInterval(retry);
            const c = peer.call(guestId, stream);
            c.on("stream", (r: MediaStream) => { clearInterval(retry); playRemoteVoice(r); });
            if (!dataConnRef.current) {
              const d = peer.connect(guestId);
              d.on("open", () => { dataConnRef.current = d; });
            }
          }, 3000);
        });
        peer.on("error", (e: unknown) => {
          setErr("No se pudo conectar con el invitado. ¿Ha pulsado 'Conectar' en las gafas?");
          setStatus("error");
          console.error("[capsula] host", e);
        });
        // Cargar voces para el panel
        fetch("/api/capsula/voices")
          .then((r) => (r.ok ? r.json() : { voices: [] }))
          .then((d: { voices?: Voice[] }) => {
            setVoices(d.voices || []);
            if (d.voices?.[0]) setVoiceId(d.voices[0].id);
          })
          .catch(() => {});
      } else {
        const peer = new window.Peer(guestId, { debug: 1 });
        peerRef.current = peer;
        peer.on("open", () => setStatus("connecting"));
        peer.on("call", (call: unknown) => {
          const c = call as PeerCall;
          c.answer(stream);
          c.on("stream", (r: MediaStream) => playRemoteVoice(r));
        });
        peer.on("connection", (conn: unknown) => {
          const dc = conn as DataConn;
          dataConnRef.current = dc;
          dc.on("data", handleData);
        });
        peer.on("error", (e: unknown) => {
          setErr("Ya hay un invitado en esta sala, o error de red.");
          setStatus("error");
          console.error("[capsula] guest", e);
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

  async function sendTts() {
    if (!ttsText.trim() || !voiceId) return;
    setSpeaking(true);
    // Enviar la orden al invitado (si está conectado)
    if (dataConnRef.current?.open !== false) {
      try { dataConnRef.current?.send({ type: "tts", text: ttsText.trim(), voiceId } as TtsMsg); } catch {}
    }
    // Reproducir también en el host (Mario oye lo mismo que el invitado)
    await playTts(ttsText.trim(), voiceId);
    setSpeaking(false);
    setTtsText("");
  }

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerRef.current?.destroy();
    };
  }, []);

  return (
    <>
      <Script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js" strategy="afterInteractive" />
      <audio ref={voiceAudioRef} autoPlay playsInline className="hidden" />
      <audio ref={ttsAudioRef} autoPlay playsInline className="hidden" />

      {/* Estado de conexión (abajo-centro) */}
      <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
        {status === "idle" && (
          <button type="button" onClick={connect}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-coral-500,#e63e73)] px-5 py-3 text-sm font-semibold text-white shadow-lg">
            <PhoneCall size={16} /> Conectar audio {isHost ? "(entrevistador)" : ""}
          </button>
        )}
        {status === "connecting" && (
          <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-5 py-3 text-sm font-medium text-white">
            <Loader2 size={16} className="animate-spin" />
            {isHost ? "Llamando al invitado…" : "Esperando al entrevistador…"}
          </div>
        )}
        {status === "live" && !isHost && (
          <button type="button" onClick={toggleMute}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${muted ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
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

      {/* Panel de voz/TTS — para el entrevistador desde que conecta.
          Aparece aunque el invitado no tenga micro: el TTS viaja por el
          canal de datos y, si no hay invitado aún, suena al menos aquí. */}
      {isHost && (status === "connecting" || status === "live") && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl bg-black/80 p-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="max-w-[40%] rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs text-white outline-none"
            >
              {voices.length === 0 && <option value="">— sin voces —</option>}
              {voices.map((v) => (
                <option key={v.id} value={v.id} className="text-black">{v.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendTts(); }}
              placeholder="Escribe lo que la voz dirá al invitado…"
              maxLength={1000}
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
            />
            <button
              type="button"
              onClick={sendTts}
              disabled={speaking || !ttsText.trim() || !voiceId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-coral-500,#e63e73)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {speaking ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
              Decir
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className={`rounded-lg px-2.5 py-2 ${muted ? "bg-red-600" : "bg-white/15"} text-white`}
              title={muted ? "Activar micro" : "Silenciar micro"}
            >
              {muted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-white/50">
            Escribe y pulsa Decir: sonará con la voz elegida en las gafas del invitado (y aquí). Tu micro sigue activo salvo que lo silencies.
          </p>
        </div>
      )}
    </>
  );
}
