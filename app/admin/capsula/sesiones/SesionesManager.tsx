"use client";

import { useEffect, useState } from "react";
import { Sparkles, Copy, Save, Loader2, ChevronDown, ChevronUp, Check, Volume2 } from "lucide-react";

type Item = {
  id: string;
  guestName: string | null;
  sala: string;
  guion: string[];
  cartaNotas: string | null;
  carta: string | null;
  createdAt: string;
};
type Voice = { id: string; name: string };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function SesionesManager({ items }: { items: Item[] }) {
  const [voices, setVoices] = useState<Voice[]>([]);
  useEffect(() => {
    fetch("/api/capsula/voices")
      .then((r) => (r.ok ? r.json() : { voices: [] }))
      .then((d: { voices?: Voice[] }) => setVoices(d.voices || []))
      .catch(() => {});
  }, []);

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
        Aún no hay sesiones. Crea una desde la <b>Torre de Control</b>.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((s) => <SesionCard key={s.id} s={s} voices={voices} />)}
    </ul>
  );
}

function SesionCard({ s, voices }: { s: Item; voices: Voice[] }) {
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState(s.cartaNotas || "");
  const [carta, setCarta] = useState(s.carta || "");
  const [gen, setGen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState("");
  const [audioBusy, setAudioBusy] = useState(false);

  useEffect(() => {
    if (!voiceId && voices[0]) setVoiceId(voices[0].id);
  }, [voices, voiceId]);

  async function generar() {
    setGen(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/capsula/carta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: s.id, cartaNotas: notas }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "No se pudo generar la carta."); return; }
      setCarta(d.carta);
      setSaved(true);
    } catch {
      setErr("Error de red al generar.");
    } finally {
      setGen(false);
    }
  }

  async function guardar() {
    setSaving(true);
    try {
      await fetch(`/api/capsula/sesion/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carta, cartaNotas: notas }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(carta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function descargarAudio() {
    if (!voiceId) return;
    setAudioBusy(true);
    setErr(null);
    try {
      // Guarda primero la carta editada para que el audio use la versión actual.
      if (!saved) await guardar();
      const res = await fetch("/api/admin/capsula/carta-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: s.id, voiceId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "No se pudo generar el audio.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carta-del-tiempo-${(s.guestName || "carta").replace(/[^a-zA-Z0-9._-]/g, "-")}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErr("Error de red al generar el audio.");
    } finally {
      setAudioBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-neutral-200 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm"
      >
        <span className="font-medium">{s.guestName || "(sin nombre)"} <span className="font-normal text-neutral-400">· {fmtDate(s.createdAt)}</span></span>
        <span className="flex items-center gap-2">
          {s.carta && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">carta lista</span>}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-4 py-3">
          {s.guion.length > 0 && (
            <p className="mb-3 text-xs text-neutral-500">
              <b>Guion vivido:</b> {s.guion.slice(0, 4).join(" · ")}{s.guion.length > 4 ? "…" : ""}
            </p>
          )}

          <label className="text-xs font-medium text-neutral-600">Notas de la sesión (qué compartió, momentos, frases)</label>
          <textarea
            value={notas}
            onChange={(e) => { setNotas(e.target.value); setSaved(false); }}
            rows={3}
            placeholder="Ej.: recordó los veranos en el pueblo con su hermana; se emocionó con la canción; dijo que…"
            className="mt-1 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />

          <button
            type="button"
            onClick={generar}
            disabled={gen}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--color-coral-500,#e63e73)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {gen ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {carta ? "Regenerar carta del tiempo" : "Generar carta del tiempo"}
          </button>
          {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

          {carta && (
            <div className="mt-4">
              <label className="text-xs font-medium text-neutral-600">Carta del tiempo (puedes ajustarla)</label>
              <textarea
                value={carta}
                onChange={(e) => { setCarta(e.target.value); setSaved(false); }}
                rows={10}
                className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-neutral-500"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={copiar}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiada" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={guardar}
                  disabled={saving || saved}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {saved ? "Guardada" : "Guardar"}
                </button>

                {/* Audio-recuerdo: la carta narrada con voz */}
                <span className="mx-1 h-4 w-px bg-neutral-200" />
                <select
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs outline-none"
                  title="Voz de la narración"
                >
                  {voices.length === 0 && <option value="">— voces —</option>}
                  {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={descargarAudio}
                  disabled={audioBusy || !voiceId}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  {audioBusy ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />} Carta en voz
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
