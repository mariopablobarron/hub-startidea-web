"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, Volume2, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Copiloto en vivo del entrevistador (panel flotante, solo en modo host con
 * una sesión cargada). Le dices cómo va reaccionando la persona y la IA sugiere
 * la siguiente frase/pregunta. "Decir esto" la lanza por voz al invitado vía el
 * evento "capsula:say", que escucha CapsulaAudio (que tiene el canal de voz).
 */
function messageText(m: UIMessage): string {
  return (m.parts || []).map((p) => (p.type === "text" ? p.text : "")).filter(Boolean).join("");
}

export function CapsulaCopiloto({ sesionId }: { sesionId: string }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/capsula/copiloto", body: { sesionId } }),
  });
  const loading = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || loading) return;
    void sendMessage({ text: t });
    setInput("");
  }

  function decir(texto: string) {
    window.dispatchEvent(new CustomEvent("capsula:say", { detail: texto }));
  }

  return (
    <div className="fixed right-4 top-16 z-50 w-[min(90vw,320px)] overflow-hidden rounded-2xl bg-black/85 text-white shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
      >
        <span className="inline-flex items-center gap-2"><Bot size={15} /> Copiloto en vivo</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <>
          <div ref={scrollRef} className="max-h-64 space-y-2 overflow-y-auto px-3 pb-2">
            {messages.length === 0 && (
              <p className="text-[11px] leading-relaxed text-white/50">
                Cuéntame cómo va la persona y te sugiero qué decir ahora. Pulsa “Decir esto” para que suene en sus gafas.
              </p>
            )}
            {messages.map((m) => {
              const text = messageText(m);
              if (m.role === "user") {
                return <div key={m.id} className="text-right text-[11px] text-white/55">{text}</div>;
              }
              return (
                <div key={m.id} className="rounded-lg bg-white/10 p-2">
                  <p className="text-sm leading-snug">{text}</p>
                  {text.trim() && !loading && (
                    <button
                      type="button"
                      onClick={() => decir(text)}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--color-coral-500,#e63e73)] px-2.5 py-0.5 text-[11px] font-semibold text-white"
                    >
                      <Volume2 size={11} /> Decir esto
                    </button>
                  )}
                </div>
              );
            })}
            {loading && <Loader2 size={14} className="animate-spin text-white/50" />}
          </div>

          <form onSubmit={submit} className="flex items-center gap-1.5 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cómo va la persona…"
              className="flex-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-coral-500,#e63e73)] text-white disabled:opacity-40"
            >
              <Send size={13} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
