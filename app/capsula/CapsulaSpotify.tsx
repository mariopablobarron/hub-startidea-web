"use client";

import { useState } from "react";
import { Music2, Search, Play, Pause, SkipForward, Loader2, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Control de Spotify en el panel del entrevistador (modo host, panel flotante).
 * Buscar canción + play/pausa/siguiente. Usa la cuenta de Spotify del HUB
 * conectada en el admin; suena en el dispositivo donde haya Spotify abierto
 * (pensado para sesiones PRESENCIALES, por los altavoces de la sala).
 */
type Track = { uri: string; name: string; artist: string };

export function CapsulaSpotify() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function control(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/capsula/spotify/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setMsg(d.message || "Spotify no conectado. Conéctalo en el admin.");
        return null;
      }
      if (!res.ok) {
        setMsg("Error al hablar con Spotify.");
        return null;
      }
      return d;
    } catch {
      setMsg("Error de red.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const d = await control("search", { query: q.trim() });
    if (d?.tracks) setResults(d.tracks);
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(90vw,300px)] overflow-hidden rounded-2xl bg-black/85 text-white shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
      >
        <span className="inline-flex items-center gap-2"><Music2 size={15} /> Spotify</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="px-3 pb-3">
          <div className="mb-2 flex items-center gap-1.5">
            <button type="button" onClick={() => control("play")} disabled={busy} className="grid h-8 w-8 place-items-center rounded-full bg-white/15 disabled:opacity-40"><Play size={14} /></button>
            <button type="button" onClick={() => control("pause")} disabled={busy} className="grid h-8 w-8 place-items-center rounded-full bg-white/15 disabled:opacity-40"><Pause size={14} /></button>
            <button type="button" onClick={() => control("next")} disabled={busy} className="grid h-8 w-8 place-items-center rounded-full bg-white/15 disabled:opacity-40"><SkipForward size={14} /></button>
            {busy && <Loader2 size={14} className="animate-spin text-white/50" />}
          </div>

          <form onSubmit={buscar} className="flex items-center gap-1.5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar canción…"
              className="flex-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/40"
            />
            <button type="submit" disabled={busy || !q.trim()} className="grid h-8 w-8 place-items-center rounded-full bg-[#1DB954] disabled:opacity-40"><Search size={13} /></button>
          </form>

          {msg && <p className="mt-1.5 text-[11px] text-amber-300">{msg}</p>}

          {results.length > 0 && (
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
              {results.map((t) => (
                <button
                  key={t.uri}
                  type="button"
                  onClick={() => control("play", { uri: t.uri })}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-white/10"
                >
                  <Play size={11} className="shrink-0" />
                  <span className="truncate"><b>{t.name}</b> · {t.artist}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
