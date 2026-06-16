import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { hasRole } from "@/lib/auth/roles";

/**
 * POST /api/admin/capsula/chat — chat de preparación de la Torre de Control.
 *
 * La IA conversa con el entrevistador (solo ADMIN) para perfilar al invitado
 * antes de la sesión: hace preguntas humanas y breves. Cuando tiene contexto
 * suficiente, invita a pulsar "Generar guion" (lo hace /generar-guion).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.CAPSULA_MODEL || "anthropic/claude-haiku-4.5";

const SYSTEM = `Eres el asistente de preparación del programa "Cápsula del Tiempo" del HUB Startidea: una experiencia inmersiva socioemocional. Ayudas al ENTREVISTADOR a perfilar a la persona invitada ANTES de la sesión, para luego poder diseñarle un guion a medida.

Tu forma de trabajar:
- Conversa, no interrogues. Haz preguntas breves y cálidas, de una en una (máximo dos).
- Cubre poco a poco: quién es la persona y qué relación tiene con el entrevistador, edad aproximada, momento vital, qué le mueve o le pesa ahora, qué le gustaría llevarse de la experiencia, y qué conviene evitar (temas sensibles).
- Refleja lo que vas entendiendo en una frase corta, para confirmar.
- Cuando tengas contexto suficiente para diseñar un buen guion, dilo con naturalidad e invita a pulsar el botón "Generar guion".
- Tono cercano, humano, profesional pero no clínico. Tuteas. Frases cortas. Sin emojis.
- Nunca eres terapeuta: no diagnosticas ni prometes curar. La experiencia acompaña, no sustituye a las personas que quieren al invitado.`;

export async function POST(req: Request) {
  if (!(await hasRole(["ADMIN"]))) {
    return new Response("No autorizado", { status: 403 });
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response("OPENROUTER_API_KEY no configurada", { status: 503 });
  }

  const { messages } = (await req.json()) as { messages: UIMessage[] };
  const openrouter = createOpenRouter({
    apiKey,
    headers: { "HTTP-Referer": "https://hubstartidea.es", "X-Title": "Cápsula · Torre de Control" },
  });

  const result = streamText({
    model: openrouter.chat(MODEL),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
  });

  return result.toUIMessageStreamResponse();
}
