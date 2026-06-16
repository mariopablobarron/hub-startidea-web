"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Loader2, Music } from "lucide-react";

type Item = { id: string; title: string; mime: string; sizeBytes: number };

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function MusicaManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    const title = file.name.replace(/\.[^.]+$/, "").slice(0, 160) || "Pista";
    const mime = file.type || "audio/mpeg";
    try {
      const res = await fetch(
        `/api/admin/capsula/musica?title=${encodeURIComponent(title)}&mime=${encodeURIComponent(mime)}`,
        { method: "POST", headers: { "Content-Type": mime }, body: file },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "No se pudo subir la pista.");
      } else {
        router.refresh();
      }
    } catch {
      setErr("Error de red al subir.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function del(id: string) {
    if (!confirm("¿Borrar esta pista?")) return;
    setDelId(id);
    try {
      await fetch(`/api/capsula/musica/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDelId(null);
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        {busy ? "Subiendo…" : "Subir pista"}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          onChange={onFile}
          disabled={busy}
          className="hidden"
        />
      </label>
      <span className="ml-3 text-xs text-neutral-400">Formatos de audio · máx 30 MB</span>
      {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

      {items.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Aún no hay pistas. Sube la primera.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((t) => (
            <li key={t.id} className="rounded-2xl border border-neutral-200 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-medium">
                  <Music size={15} className="text-neutral-400" /> {t.title}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400">{fmtSize(t.sizeBytes)}</span>
                  <button
                    type="button"
                    onClick={() => del(t.id)}
                    disabled={delId === t.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {delId === t.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </span>
              </div>
              <audio controls preload="none" src={`/api/capsula/musica/${t.id}`} className="mt-2 w-full" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
