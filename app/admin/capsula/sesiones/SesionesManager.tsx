"use client";

import { useState } from "react";
import { Sparkles, Copy, Save, Loader2, ChevronDown, ChevronUp, Check } from "lucide-react";

type Item = {
  id: string;
  guestName: string | null;
  sala: string;
  guion: string[];
  cartaNotas: string | null;
  carta: string | null;
  createdAt: string;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function SesionesManager({ items }: { items: Item[] }) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
        Aún no hay sesiones. Crea una desde la <b>Torre de Control</b>.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((s) => <SesionCard key={s.id} s={s} />)}
    </ul>
  );
}

function SesionCard({ s }: { s: Item }) {
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState(s.cartaNotas || "");
  const [carta, setCarta] = useState(s.carta || "");
  const [gen, setGen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
              <div className="mt-2 flex items-center gap-2">
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
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
