"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2, Loader2, Video, AudioLines } from "lucide-react";

type Item = {
  id: string;
  sala: string;
  kind: "AUDIO" | "VIDEO";
  mime: string;
  sizeBytes: number;
  durationSec: number | null;
  note: string | null;
  createdAt: string;
};

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fmtDur(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function RecordingsManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function del(id: string) {
    if (!confirm("¿Borrar esta grabación? No se puede deshacer.")) return;
    setBusy(id);
    try {
      await fetch(`/api/capsula/recordings/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
        Aún no hay grabaciones. Inicia una desde el panel del entrevistador en{" "}
        <code>/capsula?host=1</code> con el botón “Grabar sesión”.
      </p>
    );
  }

  return (
    <ul className="space-y-5">
      {items.map((r) => (
        <li key={r.id} className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {r.kind === "VIDEO" ? <Video size={15} /> : <AudioLines size={15} />}
              {r.kind === "VIDEO" ? "Vídeo" : "Audio"}
            </span>
            <span className="text-neutral-400">·</span>
            <span>sala <b>{r.sala}</b></span>
            <span className="text-neutral-400">·</span>
            <span>{fmtDate(r.createdAt)}</span>
            <span className="text-neutral-400">·</span>
            <span>{fmtDur(r.durationSec)}</span>
            <span className="text-neutral-400">·</span>
            <span className="text-neutral-500">{fmtSize(r.sizeBytes)}</span>
          </div>

          {r.kind === "VIDEO" ? (
            <video
              controls
              preload="metadata"
              src={`/api/capsula/recordings/${r.id}`}
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: 360 }}
            />
          ) : (
            <audio controls preload="metadata" src={`/api/capsula/recordings/${r.id}`} className="w-full" />
          )}

          {r.note && <p className="mt-2 text-sm text-neutral-600">{r.note}</p>}

          <div className="mt-3 flex items-center gap-2">
            <a
              href={`/api/capsula/recordings/${r.id}?dl=1`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700"
            >
              <Download size={14} /> Descargar
            </a>
            <button
              type="button"
              onClick={() => del(r.id)}
              disabled={busy === r.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Borrar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
