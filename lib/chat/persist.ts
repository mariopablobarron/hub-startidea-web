/**
 * Persistencia de conversaciones del chatbot público.
 *
 * Decisión: NO commiteamos cada turno a GitHub (sería 1 commit por mensaje =
 * ruido infinito en git). En su lugar:
 * - Buffer en memoria por conversationId.
 * - Cuando la conversación lleva ≥ 60 segundos sin actividad O al cierre del
 *   widget, se hace 1 commit con el JSON completo de la conversación.
 *
 * Es una simplificación. Si se reinicia el contenedor antes del flush, se
 * pierden los últimos turnos en memoria (pero la conversación que acaba de
 * pasar sí la tiene el visitante en pantalla, no es crítico).
 */

import { commitFile } from "@/lib/admin/persist";

type BufferedConversation = {
  id: string;
  fingerprint: string;
  startedAt: string;
  lastMessageAt: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string; timestamp: string }>;
  flushTimer?: NodeJS.Timeout;
  totalUsage: { promptTokens: number; completionTokens: number };
};

const buffer = new Map<string, BufferedConversation>();
const FLUSH_DELAY_MS = 60_000;

export async function saveConversationTurn(opts: {
  conversationId: string;
  fingerprint: string;
  userMessage: { role: string; content: string } | undefined;
  assistantMessage: { role: string; content: string };
  usage?: { promptTokens?: number; completionTokens?: number };
}) {
  const now = new Date().toISOString();
  let conv = buffer.get(opts.conversationId);
  if (!conv) {
    conv = {
      id: opts.conversationId,
      fingerprint: opts.fingerprint,
      startedAt: now,
      lastMessageAt: now,
      messages: [],
      totalUsage: { promptTokens: 0, completionTokens: 0 },
    };
    buffer.set(opts.conversationId, conv);
  }

  if (opts.userMessage) {
    conv.messages.push({
      role: opts.userMessage.role as "user",
      content: opts.userMessage.content,
      timestamp: now,
    });
  }
  conv.messages.push({
    role: "assistant",
    content: opts.assistantMessage.content,
    timestamp: now,
  });
  conv.lastMessageAt = now;
  conv.totalUsage.promptTokens += opts.usage?.promptTokens ?? 0;
  conv.totalUsage.completionTokens += opts.usage?.completionTokens ?? 0;

  // (Re)programa el flush
  if (conv.flushTimer) clearTimeout(conv.flushTimer);
  conv.flushTimer = setTimeout(() => {
    void flushConversation(opts.conversationId).catch((e) =>
      console.error("[chat] flush failed:", e),
    );
  }, FLUSH_DELAY_MS);
}

async function flushConversation(conversationId: string) {
  const conv = buffer.get(conversationId);
  if (!conv) return;

  // Filename con fecha para que sea fácil ordenar y purgar viejos.
  const date = conv.startedAt.slice(0, 10); // YYYY-MM-DD
  const path = `data/conversations/${date}/${conversationId}.json`;
  const payload = {
    id: conv.id,
    fingerprint: conv.fingerprint,
    startedAt: conv.startedAt,
    lastMessageAt: conv.lastMessageAt,
    messages: conv.messages,
    totalUsage: conv.totalUsage,
  };

  try {
    await commitFile({
      path,
      content: JSON.stringify(payload, null, 2) + "\n",
      message: `chore(chat): conversación ${conversationId.slice(0, 8)} (${conv.messages.length} mensajes)`,
    });
    buffer.delete(conversationId);
  } catch (e) {
    console.error("[chat] commit failed for", conversationId, e);
    // dejamos el buffer y reintentamos en próximo turno
  }
}
