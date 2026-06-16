"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles, ExternalLink, Save, X } from "lucide-react";
import { MODOS } from "@/app/capsula/modos";

type GuionItem = { fase: string; texto: string };

const WELCOME: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [{
    type: "text",
    text: "Vamos a preparar la sesión. Cuéntame de la persona que vas a recibir: ¿quién es, qué relación tienes con ella, y qué te gustaría que se llevara de la experiencia?",
  }],
};

function messageText(m: UIMessage): string {
  return (m.parts || []).map((p) => (p.type === "text" ? p.text : "")).filter(Boolean).join("");
}

export function TorreDeControl() {
  const [input, setInput] = useState("");
  const [guestName, setGuestName] = useState("");
  const [sala, setSala] = useState("estudio");
  const [modoBase, setModoBase] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/admin/capsula/chat" }),
    messages: [WELCOME],
  });
  const isLoading = status === "streaming" || status === "submitted";

  const [guion, setGuion] = useState<GuionItem[] | null>(null);
  const [titulo, setTitulo] = useState("");
  const [ambiente, setAmbiente] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submitChat(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || isLoading) return;
    void sendMessage({ text: t });
    setInput("");
  }

  async function generar() {
    setErr(null);
    setGenerating(true);
    const transcript = messages
      .map((m) => ({ role: m.role, content: messageText(m) }))
      .filter((m) => m.content.trim());
    try {
      const res = await fetch("/api/admin/capsula/generar-guion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sala, guestName, modoBase, transcript }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "No se pudo generar el guion."); return; }
      setSessionId(data.id);
      setGuion(data.guion);
      setTitulo(data.tituloSesion || "");
      setAmbiente(data.ambiente || null);
      setSavedAt(Date.now());
    } catch {
      setErr("Error de red al generar el guion.");
    } finally {
      setGenerating(false);
    }
  }

  function editFrase(i: number, texto: string) {
    setGuion((g) => (g ? g.map((it, idx) => (idx === i ? { ...it, texto } : it)) : g));
    setSavedAt(null);
  }

  async function guardar() {
    if (!sessionId || !guion) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/capsula/sesion/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guion }),
      });
      if (res.ok) setSavedAt(Date.now());
      else setErr("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  const liveUrl = sessionId
    ? `/capsula?host=1&sala=${encodeURIComponent(sala)}&sesion=${sessionId}`
    : null;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      {/* Columna izquierda: contexto + chat */}
      <section className="flex flex-col rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold">1 · Perfila al invitado</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Nombre del invitado"
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <select
            value={modoBase}
            onChange={(e) => setModoBase(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none"
            title="Propósito / modo base"
          >
            <option value="">Modo: lo decide la IA</option>
            {MODOS.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
          <input
            value={sala}
            onChange={(e) => setSala(e.target.value)}
            placeholder="sala"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            title="Código de sala (igual en las gafas)"
          />
        </div>

        <div ref={scrollRef} className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-lg bg-neutral-50 p-3" style={{ maxHeight: 340 }}>
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-neutral-900 text-white" : "bg-white text-neutral-800 shadow-sm"}`}>
                {messageText(m)}
              </div>
            </div>
          ))}
          {isLoading && <Loader2 size={16} className="animate-spin text-neutral-400" />}
          {error && <p className="text-xs text-red-600">Algo falló en el chat. Reintenta.</p>}
        </div>

        <form onSubmit={submitChat} className="mt-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submitChat(e); }}
            placeholder="Escribe sobre la persona…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          {isLoading ? (
            <button type="button" onClick={stop} className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-white"><X size={14} /></button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-white disabled:opacity-40"><Send size={14} /></button>
          )}
        </form>

        <button
          type="button"
          onClick={generar}
          disabled={generating}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-coral-500,#e63e73)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {guion ? "Regenerar guion" : "Generar guion"}
        </button>
      </section>

      {/* Columna derecha: guion generado */}
      <section className="flex flex-col rounded-2xl border border-neutral-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold">2 · Guion de la sesión</h2>
        {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

        {!guion && !generating && (
          <p className="mt-3 text-sm text-neutral-400">
            Aún no hay guion. Perfila al invitado y pulsa “Generar guion”.
          </p>
        )}
        {generating && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 size={15} className="animate-spin" /> La IA está diseñando el guion…
          </p>
        )}

        {guion && (
          <>
            {titulo && <p className="mt-2 text-sm font-medium text-neutral-700">{titulo}</p>}
            {ambiente && <p className="text-xs text-neutral-500">Ambiente sugerido: {ambiente}</p>}
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: 380 }}>
              {guion.map((it, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 p-2">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-400">{it.fase}</span>
                  <textarea
                    value={it.texto}
                    onChange={(e) => editFrase(i, e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded border-0 bg-transparent p-0 text-sm outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={guardar}
                disabled={saving || savedAt !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {savedAt !== null ? "Guardado ✓" : "Guardar cambios"}
              </button>
              {liveUrl && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-700"
                >
                  <ExternalLink size={14} /> Abrir experiencia en vivo
                </a>
              )}
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              El invitado abre <code>/capsula</code> en las gafas (sala “{sala}”). Tú abres el enlace de arriba.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
