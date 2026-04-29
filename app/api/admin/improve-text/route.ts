import { auth } from "@/auth";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.IMPROVE_MODEL || "anthropic/claude-haiku-4.5";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new Response("OPENROUTER_API_KEY no configurada", { status: 503 });

  const { text, context, mode } = (await req.json()) as {
    text: string;
    context?: string;
    mode?: "polish" | "shorter" | "longer" | "warmer";
  };
  if (!text || text.length > 4000) return new Response("Texto vacío o demasiado largo", { status: 400 });

  const instruction = {
    polish: "Mejora la redacción manteniendo el sentido y el tono. Corrige sutilezas y suena natural.",
    shorter: "Acorta el texto manteniendo lo esencial. Frases cortas, sin perder calidez.",
    longer: "Amplía el texto un 20-40% añadiendo concreción (ejemplos, beneficios). Mantén el tono.",
    warmer: "Hazlo un poco más cálido y humano, sin caer en cursilería.",
  }[mode || "polish"];

  const openrouter = createOpenRouter({ apiKey });

  const result = await generateText({
    model: openrouter.chat(MODEL),
    system:
      "Eres editor de copy para la web del HUB Startidea, un coworking en Granada con voz directa, cálida, profesional pero NO corporativa. Tuteas siempre. Frases cortas. Sin emojis. Mantén siempre el sentido original.",
    prompt: `${instruction}\n\n${context ? `Contexto del campo (no parte del texto a editar): ${context}\n\n` : ""}Texto a mejorar:\n"""${text}"""\n\nDevuelve SOLO el texto mejorado, sin comillas ni meta-comentarios.`,
    temperature: 0.6,
    maxOutputTokens: 600,
  });

  return Response.json({ improved: result.text.trim() });
}
