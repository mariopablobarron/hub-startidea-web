"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { Mic, MicOff, PhoneCall, Loader2, Volume2, VolumeX } from "lucide-react";
import { MODOS } from "./modos";
import { DESTINOS } from "./destinos";
import { startSoundscape, type SoundPreset, type Soundscape } from "./soundscape";

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
type DestinoMsg = { type: "destino"; id: string };
type SonidoMsg = { type: "sonido"; preset: SoundPreset };
type RecMsg = { type: "rec"; action: "start" | "stop" };
type RecDoneMsg = { type: "recdone"; ok: boolean };
type DataMsg = TtsMsg | DestinoMsg | SonidoMsg | RecMsg | RecDoneMsg;

const SOUND_LABEL: Record<SoundPreset, string> = {
  none: "sin fondo", olas: "olas", lluvia: "lluvia", viento: "viento", drone: "presencia",
};

// Primer mimeType de grabación soportado por el navegador (Quest incluida).
function pickRecMime(kind: "audio" | "video"): string {
  const cands = kind === "video"
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of cands) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "";
}

export function CapsulaAudio({
  sala = "estudio",
  isHost,
  activeId,
  onSelect,
}: {
  sala?: string;
  isHost: boolean;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [modoId, setModoId] = useState(MODOS[0].id);
  const modo = MODOS.find((m) => m.id === modoId) || MODOS[0];
  const [soundOn, setSoundOn] = useState(true);

  const peerRef = useRef<PeerInstance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const dataConnRef = useRef<DataConn | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  // Valor siempre-fresco del ambiente activo, para enviarlo al abrir el canal.
  const activeIdRef = useRef(activeId);
  // Audio ambiente generativo (Web Audio API).
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundscapeRef = useRef<Soundscape | null>(null);
  const soundPresetRef = useRef<SoundPreset>("none");
  // Grafo de grabación: bus audible (→ altavoces y → grabación) + micro.
  const audibleBusRef = useRef<GainNode | null>(null);
  const recordDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const ttsSrcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef<number>(0);
  const [recording, setRecording] = useState(false);
  const [recInfo, setRecInfo] = useState<string | null>(null);

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

  // AudioContext compartido para el sonido ambiente (creado tras el gesto del
  // usuario al pulsar Conectar; reanudado si el navegador lo suspende).
  const ensureCtx = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) {
      try {
        const AC = window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        audioCtxRef.current = ctx;
        // Grafo: TODO lo audible pasa por un bus → altavoces y → grabación.
        // El micro va aparte (solo a grabación: el invitado no se oye a sí mismo).
        const bus = ctx.createGain();
        bus.connect(ctx.destination);
        audibleBusRef.current = bus;
        const rd = ctx.createMediaStreamDestination();
        bus.connect(rd);
        recordDestRef.current = rd;
        // El TTS (elemento <audio>) se enruta por el bus (audible + grabable).
        if (ttsAudioRef.current && !ttsSrcRef.current) {
          try {
            const s = ctx.createMediaElementSource(ttsAudioRef.current);
            s.connect(bus);
            ttsSrcRef.current = s;
          } catch { /* ya conectado */ }
        }
      } catch { return null; }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Arranca / cambia / detiene el paisaje sonoro local según el preset.
  const applySound = useCallback((preset: SoundPreset) => {
    if (preset === soundPresetRef.current) return;
    soundscapeRef.current?.stop();
    soundscapeRef.current = null;
    soundPresetRef.current = preset;
    if (preset === "none") return;
    const ctx = ensureCtx();
    if (ctx) soundscapeRef.current = startSoundscape(ctx, preset, 0.14, audibleBusRef.current || undefined);
  }, [ensureCtx]);

  // === Grabación (la ejecuta el INVITADO; el host la dispara por datos) ===

  // Sube el blob grabado al servidor y avisa al host del resultado.
  const uploadRecording = useCallback(async (kind: "audio" | "video", mimeType: string) => {
    const blob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
    chunksRef.current = [];
    if (!blob.size) {
      try { dataConnRef.current?.send({ type: "recdone", ok: false } as RecDoneMsg); } catch {}
      return;
    }
    const dur = Math.round((performance.now() - recStartRef.current) / 1000);
    const baseMime = (mimeType || "video/webm").split(";")[0];
    let ok = false;
    try {
      const res = await fetch(
        `/api/capsula/recordings?sala=${encodeURIComponent(sala)}&kind=${kind}&dur=${dur}&mime=${encodeURIComponent(baseMime)}`,
        { method: "POST", headers: { "Content-Type": baseMime }, body: blob },
      );
      ok = res.ok;
    } catch { ok = false; }
    try { dataConnRef.current?.send({ type: "recdone", ok } as RecDoneMsg); } catch {}
  }, [sala]);

  // Arranca la grabación: vídeo del lienzo 360 + mezcla de audio (micro +
  // voz del entrevistador + TTS + ambiente). Si no hay lienzo, graba solo audio.
  const startRecording = useCallback(() => {
    if (recorderRef.current) return;
    const ctx = ensureCtx();
    if (!ctx || !recordDestRef.current) return;
    const tracks: MediaStreamTrack[] = [];
    let kind: "audio" | "video" = "audio";
    const canvas = document
      .querySelector("a-scene")
      ?.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas && typeof canvas.captureStream === "function") {
      try {
        canvas.captureStream(30).getVideoTracks().forEach((t) => tracks.push(t));
        if (tracks.length) kind = "video";
      } catch { /* sin vídeo → solo audio */ }
    }
    recordDestRef.current.stream.getAudioTracks().forEach((t) => tracks.push(t));
    if (!tracks.length) return;
    const mixed = new MediaStream(tracks);
    const mime = pickRecMime(kind);
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(mixed, mime ? { mimeType: mime } : undefined);
    } catch {
      try { rec = new MediaRecorder(mixed); } catch { return; }
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => { void uploadRecording(kind, rec.mimeType); };
    try { rec.start(1000); } catch { return; } // timeslice 1s
    recorderRef.current = rec;
    recStartRef.current = performance.now();
    setRecording(true);
  }, [ensureCtx, uploadRecording]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch {}
    }
  }, []);

  // HOST: dispara/detiene la grabación en el invitado por el canal de datos.
  function toggleRecording() {
    if (!dataConnRef.current || dataConnRef.current.open === false) {
      setRecInfo("No hay invitado conectado para grabar");
      return;
    }
    const next = !recording;
    setRecording(next);
    setRecInfo(next ? "Grabando…" : "Procesando grabación…");
    try {
      dataConnRef.current.send({ type: "rec", action: next ? "start" : "stop" } as RecMsg);
    } catch {}
  }

  function playRemoteVoice(stream: MediaStream) {
    const ctx = ensureCtx();
    if (ctx && audibleBusRef.current) {
      try {
        // Enrutar por el bus (audible + grabable). El <audio> muteado solo
        // "activa" el flujo del MediaStream remoto en algunos navegadores.
        ctx.createMediaStreamSource(stream).connect(audibleBusRef.current);
        if (voiceAudioRef.current) {
          voiceAudioRef.current.srcObject = stream;
          voiceAudioRef.current.muted = true;
          voiceAudioRef.current.play().catch(() => {});
        }
      } catch {
        if (voiceAudioRef.current) {
          voiceAudioRef.current.srcObject = stream;
          voiceAudioRef.current.muted = false;
          voiceAudioRef.current.play().catch(() => {});
        }
      }
    } else if (voiceAudioRef.current) {
      voiceAudioRef.current.srcObject = stream;
      voiceAudioRef.current.play().catch(() => {});
    }
    setStatus("live");
  }

  // El invitado recibe por datos: TTS (genera+reproduce) y cambios de
  // ambiente (actualiza su escena para seguir al entrevistador).
  const handleData = useCallback((raw: unknown) => {
    const msg = raw as DataMsg;
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "tts" && msg.text && msg.voiceId) {
      void playTts(msg.text, msg.voiceId);
    } else if (msg.type === "destino" && msg.id) {
      onSelect(msg.id);
    } else if (msg.type === "sonido") {
      applySound(msg.preset);
    } else if (msg.type === "rec" && !isHost) {
      // El invitado graba cuando el entrevistador lo pide.
      if (msg.action === "start") startRecording();
      else stopRecording();
    } else if (msg.type === "recdone" && isHost) {
      // El entrevistador recibe el resultado de la subida.
      setRecording(false);
      setRecInfo(msg.ok ? "Grabación guardada ✓" : "No se pudo guardar la grabación");
    }
  }, [playTts, onSelect, applySound, startRecording, stopRecording, isHost]);

  async function connect() {
    setErr(null);
    setStatus("connecting");
    try {
      if (!window.Peer) throw new Error("Librería de audio aún cargando, reintenta en 2s.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      // Crear AudioContext con el gesto activo + enrutar el micro SOLO a la
      // grabación (el invitado no se oye a sí mismo, pero su voz se graba).
      const ac = ensureCtx();
      if (ac && recordDestRef.current) {
        try { ac.createMediaStreamSource(stream).connect(recordDestRef.current); } catch {}
      }

      if (isHost) {
        const peer = new window.Peer(undefined, { debug: 1 });
        peerRef.current = peer;
        peer.on("open", () => {
          // Canal de voz
          const call = peer.call(guestId, stream);
          call.on("stream", (r: MediaStream) => playRemoteVoice(r));
          // Canal de datos (TTS + ambiente + control de grabación)
          const dc = peer.connect(guestId);
          dc.on("data", handleData); // recibe "recdone" del invitado
          dc.on("open", () => {
            dataConnRef.current = dc;
            try {
              dc.send({ type: "destino", id: activeIdRef.current } as DestinoMsg);
              dc.send({ type: "sonido", preset: soundPresetRef.current } as SonidoMsg);
            } catch {}
          });
          // Reintentos por si el invitado conecta después
          let tries = 0;
          const retry = setInterval(() => {
            if (status === "live" || tries++ > 12) return clearInterval(retry);
            const c = peer.call(guestId, stream);
            c.on("stream", (r: MediaStream) => { clearInterval(retry); playRemoteVoice(r); });
            if (!dataConnRef.current) {
              const d = peer.connect(guestId);
              d.on("data", handleData);
              d.on("open", () => {
                dataConnRef.current = d;
                try {
                  d.send({ type: "destino", id: activeIdRef.current } as DestinoMsg);
                  d.send({ type: "sonido", preset: soundPresetRef.current } as SonidoMsg);
                } catch {}
              });
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

  // Envía un texto al invitado (canal de datos) y lo reproduce también aquí.
  // Lo usan tanto los guiones del modo como el campo de texto libre.
  async function speak(text: string) {
    const t = text.trim();
    if (!t || !voiceId || speaking) return;
    setSpeaking(true);
    if (dataConnRef.current?.open !== false) {
      try { dataConnRef.current?.send({ type: "tts", text: t, voiceId } as TtsMsg); } catch {}
    }
    await playTts(t, voiceId);
    setSpeaking(false);
  }

  async function sendFromInput() {
    if (!ttsText.trim()) return;
    const t = ttsText;
    setTtsText("");
    await speak(t);
  }

  // Mantener fresco el ref del ambiente (para el envío al abrir el canal).
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // HOST: propagar el ambiente al invitado cuando cambia —venga del selector
  // de arriba o de los botones del panel— si el canal de datos está abierto.
  useEffect(() => {
    if (!isHost) return;
    const dc = dataConnRef.current;
    if (dc && dc.open !== false) {
      try { dc.send({ type: "destino", id: activeId } as DestinoMsg); } catch {}
    }
  }, [activeId, isHost]);

  // HOST: el sonido efectivo = el del modo (salvo que el host lo silencie).
  // Al cambiar, lo aplica aquí y lo propaga al invitado.
  useEffect(() => {
    if (!isHost) return;
    const eff: SoundPreset = soundOn ? modo.sonido : "none";
    applySound(eff);
    const dc = dataConnRef.current;
    if (dc && dc.open !== false) {
      try { dc.send({ type: "sonido", preset: eff } as SonidoMsg); } catch {}
    }
  }, [isHost, soundOn, modo.sonido, applySound]);

  useEffect(() => {
    return () => {
      try { recorderRef.current?.stop(); } catch {}
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      soundscapeRef.current?.stop();
      audioCtxRef.current?.close().catch(() => {});
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
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={connect}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-coral-500,#e63e73)] px-5 py-3 text-sm font-semibold text-white shadow-lg">
              <PhoneCall size={16} /> Conectar audio {isHost ? "(entrevistador)" : ""}
            </button>
            {!isHost && (
              <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/80">
                Esta sesión puede grabarse (imagen y voz)
              </span>
            )}
          </div>
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

      {/* Aviso visible al invitado mientras se graba (consentimiento en vivo). */}
      {!isHost && recording && (
        <div className="fixed top-16 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
          Grabando esta sesión
        </div>
      )}

      {/* Panel del entrevistador — desde que conecta. Aparece aunque el
          invitado no tenga micro: el TTS viaja por el canal de datos y, si
          no hay invitado aún, suena al menos aquí. */}
      {isHost && (status === "connecting" || status === "live") && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(94vw,640px)] -translate-x-1/2 rounded-2xl bg-black/80 p-3 backdrop-blur">
          {/* Grabación: el invitado graba lo que ve + habla + escucha */}
          <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
            <button
              type="button"
              onClick={toggleRecording}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                recording ? "bg-red-600 text-white" : "bg-white/15 text-white hover:bg-white/25"
              }`}
              title="Graba la sesión en las gafas del invitado y la sube al servidor"
            >
              <span className={`inline-block h-2.5 w-2.5 rounded-full bg-red-500 ${recording ? "animate-pulse" : ""}`} />
              {recording ? "Detener grabación" : "Grabar sesión"}
            </button>
            {recInfo && <span className="text-[11px] text-white/60">{recInfo}</span>}
          </div>

          {/* Modo (al elegirlo, salta a su ambiente sugerido) + público */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <select
              value={modoId}
              onChange={(e) => {
                const m = MODOS.find((x) => x.id === e.target.value);
                setModoId(e.target.value);
                if (m) onSelect(m.ambiente);
              }}
              className="rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-xs font-semibold text-white outline-none"
              title="Modo de la experiencia"
            >
              {MODOS.map((m) => (
                <option key={m.id} value={m.id} className="text-black">{m.nombre}</option>
              ))}
            </select>
            <span className="text-[11px] text-white/50">{modo.publico}</span>
            <button
              type="button"
              onClick={() => setSoundOn((v) => !v)}
              disabled={modo.sonido === "none"}
              className={`ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                modo.sonido === "none"
                  ? "cursor-default bg-white/5 text-white/30"
                  : soundOn
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-white/50"
              }`}
              title="Sonido ambiente"
            >
              {soundOn && modo.sonido !== "none" ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {SOUND_LABEL[modo.sonido]}
            </button>
          </div>

          {/* Ambiente: control desde el propio panel (además del de arriba) */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-white/50">Ambiente:</span>
            {DESTINOS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                  activeId === d.id ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/25"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Guiones del modo: un clic = suena en las gafas del invitado */}
          <div className="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {modo.guiones.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => speak(g)}
                disabled={speaking || !voiceId}
                className="rounded-full bg-white/10 px-2.5 py-1 text-left text-[11px] text-white transition hover:bg-white/25 disabled:opacity-40"
                title="Decir esta frase"
              >
                {g}
              </button>
            ))}
          </div>

          {/* Voz + texto libre + decir + micro */}
          <div className="flex items-center gap-2">
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="max-w-[34%] rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-xs text-white outline-none"
              title="Voz"
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
              onKeyDown={(e) => { if (e.key === "Enter") sendFromInput(); }}
              placeholder="…o escribe algo libre y pulsa Decir"
              maxLength={1000}
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
            />
            <button
              type="button"
              onClick={sendFromInput}
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
            Pulsa una frase del guion o escribe la tuya: sonará con la voz elegida en las gafas del invitado (y aquí). Tu micro sigue activo salvo que lo silencies.
          </p>
        </div>
      )}
    </>
  );
}
