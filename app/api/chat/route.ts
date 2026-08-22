import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { InvalidConversationIdError, resolveConversationId } from "@/lib/chat/conversationId";
import { buildSystemPrompt } from "@/lib/chat/systemPrompt";
import { checkRateLimit, fingerprintFrom } from "@/lib/chat/rateLimit";
import { saveConversationTurn } from "@/lib/chat/persist";
import { chatTools } from "@/lib/chat/tools";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.CHAT_MODEL || "anthropic/claude-haiku-4.5";

function uiMessageText(m: UIMessage): string {
  return (m.parts || [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  let body: { messages?: unknown; conversationId?: unknown };
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("body inválido");
    }
    body = parsed as { messages?: unknown; conversationId?: unknown };
  } catch {
    return Response.json({ error: "invalid_request", message: "JSON inválido" }, { status: 400 });
  }

  let conversationId: string;
  try {
    conversationId = resolveConversationId(body.conversationId);
  } catch (error) {
    if (error instanceof InvalidConversationIdError) {
      return Response.json(
        { error: "invalid_conversation_id", message: "conversationId inválido" },
        { status: 400 },
      );
    }
    throw error;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response("OpenRouter API key no configurada", { status: 503 });
  }

  const fingerprint = fingerprintFrom(req);
  const rl = checkRateLimit(fingerprint);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({
        error: "rate_limit",
        message:
          rl.reason === "minute"
            ? "Vas un poco rápido — espera un momento."
            : "Has alcanzado el límite por hora. Si necesitas hablar ya, escribe directamente a hola@hubstartidea.es.",
        retryAfterSeconds: rl.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  const messages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : [];

  const openrouter = createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": "https://hubstartidea.es",
      "X-Title": "HUB Startidea Chatbot",
    },
  });

  const result = streamText({
    model: openrouter.chat(MODEL),
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(messages),
    temperature: 0.4,
    tools: chatTools,
    // Permite que el modelo encadene varias tools en un mismo turno
    // (e.g. listRooms → checkAvailability → quotePrice → startBookingFlow)
    // sin tener que pedirle al usuario que confirme paso a paso.
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, usage }) => {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      void saveConversationTurn({
        conversationId,
        fingerprint,
        userMessage: lastUser ? { role: "user", content: uiMessageText(lastUser) } : undefined,
        assistantMessage: { role: "assistant", content: text },
        usage: {
          promptTokens: (usage as { promptTokens?: number; inputTokens?: number }).promptTokens ?? (usage as { inputTokens?: number }).inputTokens ?? 0,
          completionTokens: (usage as { completionTokens?: number; outputTokens?: number }).completionTokens ?? (usage as { outputTokens?: number }).outputTokens ?? 0,
        },
      }).catch((e) => console.error("[chat] persist failed:", e));
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Conversation-Id": conversationId,
      "X-Rate-Limit-Remaining": String(rl.remaining),
    },
  });
}
