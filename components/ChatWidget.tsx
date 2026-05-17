"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const STORAGE_KEY = "hub-chat-consent";

const WELCOME: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "¡Hola! Soy el asistente del HUB Startidea. ¿En qué puedo ayudarte? Tarifas, salas, podcast, eventos, cómo llegar… pregunta sin miedo.",
    },
  ],
};

function messageText(m: UIMessage): string {
  return (m.parts || [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("");
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    messages: [WELCOME],
  });

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      setConsent(v === "1");
    } catch {
      setConsent(false);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  const onAcceptConsent = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setConsent(true);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    void sendMessage({ text: trimmed });
    setInput("");
  };

  return (
    <>
      {/* Botón flotante */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            aria-label="Abrir chat con el HUB Startidea"
            // Mobile: FAB compacto (solo icono) para no tapar CTAs del hero/cards.
            // Desktop (sm+): pill con texto "Pregúntale al HUB".
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[var(--color-coral-500)] p-3 text-sm font-medium text-white shadow-xl transition hover:bg-[var(--color-coral-600)] sm:px-5 sm:py-3"
          >
            <MessageCircle size={18} />
            <span className="hidden sm:inline">Pregúntale al HUB</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-5 right-5 z-50 flex max-h-[min(640px,calc(100vh-2.5rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] shadow-2xl"
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-ink)] px-4 py-3 text-[var(--color-paper)]">
              <div>
                <div className="font-display text-base">HUB Startidea</div>
                <div className="text-xs text-white/60">Asistente · respuestas al instante</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat"
                className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </header>

            {/* Aviso GDPR primera vez */}
            {consent === false && (
              <div className="border-b border-[var(--color-line)] bg-[var(--color-paper-2)] p-4 text-xs text-[var(--color-mute)]">
                <p className="leading-relaxed">
                  Las conversaciones se guardan para mejorar el servicio y entender qué necesita la
                  comunidad. No usamos tus datos para nada más.{" "}
                  <a href="/privacidad" className="underline hover:text-[var(--color-coral-600)]">
                    Política de privacidad
                  </a>
                  .
                </p>
                <button
                  onClick={onAcceptConsent}
                  className="mt-3 rounded-full bg-[var(--color-ink)] px-3 py-1.5 text-xs font-medium text-[var(--color-paper)] hover:bg-[var(--color-ink-2)]"
                >
                  Entendido, empezar a chatear
                </button>
              </div>
            )}

            {/* Mensajes */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((m) => {
                const text = messageText(m);
                return (
                  <Bubble key={m.id} role={m.role}>
                    {m.role === "assistant" ? (
                      <ReactMarkdown
                        components={{
                          a: ({ href, children, ...props }) => (
                            <a
                              href={href}
                              target={href?.startsWith("http") ? "_blank" : undefined}
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 font-medium text-[var(--color-coral-600)] underline hover:text-[var(--color-coral-700)]"
                              {...props}
                            >
                              {children}
                              {href?.startsWith("http") && <ExternalLink size={12} />}
                            </a>
                          ),
                          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                        }}
                      >
                        {text}
                      </ReactMarkdown>
                    ) : (
                      <p className="leading-relaxed">{text}</p>
                    )}
                  </Bubble>
                );
              })}
              {isLoading && (
                <Bubble role="assistant">
                  <Loader2 size={14} className="animate-spin text-[var(--color-mute)]" />
                </Bubble>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  Algo ha fallado. Si persiste, escríbenos a{" "}
                  <a href="mailto:hola@hubstartidea.es" className="font-medium underline">
                    hola@hubstartidea.es
                  </a>
                  .
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={onSubmit}
              className="flex items-end gap-2 border-t border-[var(--color-line)] bg-[var(--color-paper-2)] p-3"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                  }
                }}
                disabled={consent !== true}
                placeholder={consent ? "Escribe tu pregunta…" : "Acepta el aviso para empezar"}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm focus:border-[var(--color-ink)] focus:outline-none disabled:opacity-50"
              />
              {isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label="Detener respuesta"
                  className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] transition hover:bg-[var(--color-ink-2)]"
                >
                  <X size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || consent !== true}
                  aria-label="Enviar pregunta"
                  className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-coral-500)] text-white transition hover:bg-[var(--color-coral-600)] disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ role, children }: { role: string; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--color-ink)] px-4 py-2.5 text-sm text-[var(--color-paper)]"
            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--color-paper-2)] px-4 py-2.5 text-sm text-[var(--color-ink)]"
        }
      >
        {children}
      </div>
    </div>
  );
}
