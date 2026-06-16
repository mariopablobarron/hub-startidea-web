import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/capsula/copiloto — copiloto en vivo del entrevistador.
 *
 * Durante la sesión, el entrevistador escribe cómo va reaccionando la persona
 * y la IA sugiere SOLO la siguiente intervención (una frase/pregunta breve,
 * lista para decir). Conoce el contexto del invitado y el guion de la
 * CapsulaSession (?sesion). Same-origin (el host no está logueado); el contexto
 * sensible se usa server-side, nunca se expone al cliente.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.CAPSULA_MODEL || "anthropic/claude-haiku-4.5";

function sameOrigin(req: Request): boolean {
  const host = req.headers.get("host") || "";
  if (!host) return false;
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  return origin.includes(host);
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("origen-no-permitido", { status: 403 });
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new Response("OPENROUTER_API_KEY no configurada", { status: 503 });

  const { messages, sesionId } = (await req.json()) as {
    messages: UIMessage[];
    sesionId?: string;
  };

  let contexto = "(sin sesión cargada — guíate por lo que te cuente el entrevistador)";
  if (sesionId) {
    const s = await prisma.capsulaSession.findUnique({
      where: { id: sesionId },
      select: { guestName: true, guestContext: true, guion: true },
    });
    if (s) {
      const frases = Array.isArray(s.guion)
        ? (s.guion as Array<{ texto?: string }>).map((g) => g?.texto).filter(Boolean).join(" / ")
        : "";
      contexto = `Invitado: ${s.guestName || "(sin nombre)"}\nContexto: ${s.guestContext}\nGuion previsto: ${frases}`;
    }
  }

  const system = `Eres el COPILOTO EN VIVO del entrevistador durante una sesión del programa "Cápsula del Tiempo" (experiencia inmersiva socioemocional). Conoces a la persona invitada:

${contexto}

El entrevistador te dirá cómo va reaccionando la persona en cada momento. Tu única tarea: sugerir LA SIGUIENTE intervención que debería decir, AHORA.

Reglas:
- Responde con UNA frase o pregunta, dos como mucho. Lista para decir en voz alta. Nada de explicaciones, listas ni opciones.
- Tono cálido, humano, pausado. Tuteas a la persona.
- Si está emocionada o en silencio, prioriza acompañar y dar espacio sobre preguntar ("Tómate tu tiempo", "Estoy aquí contigo").
- Nunca clínico ni terapéutico. La experiencia acompaña, no sustituye a quienes la quieren.
- Adáptate a su momento; usa su nombre si lo sabes.
- Devuelve solo la frase, sin comillas ni meta-comentarios.`;

  const openrouter = createOpenRouter({
    apiKey,
    headers: { "HTTP-Referer": "https://hubstartidea.es", "X-Title": "Cápsula · Copiloto" },
  });

  const result = streamText({
    model: openrouter.chat(MODEL),
    system,
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
  });

  return result.toUIMessageStreamResponse();
}
