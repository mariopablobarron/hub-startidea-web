import type { UIMessage } from "ai";

export type ChatMessage = UIMessage;

export type Conversation = {
  id: string;
  startedAt: string;
  lastMessageAt: string;
  visitor: {
    /** Hash de IP + user-agent (no PII directa). */
    fingerprint: string;
    locale?: string;
    referrer?: string;
  };
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
  }>;
  /** Marcado por el bot cuando deriva a WhatsApp/email. */
  handoffRequested?: boolean;
  /** Resumen one-liner generado al cerrar (útil en /admin/conversaciones). */
  summary?: string;
};

export type Faq = typeof import("@/data/faq.json");
