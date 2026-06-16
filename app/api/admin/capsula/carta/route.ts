import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/roles";

/**
 * POST /api/admin/capsula/carta — la IA redacta la "Carta del Tiempo": el
 * recuerdo escrito que la persona se lleva tras su sesión. A partir del
 * contexto del invitado + el guion vivido + las notas del entrevistador.
 * Solo ADMIN. Guarda el resultado en CapsulaSession.carta.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.CAPSULA_MODEL || "anthropic/claude-haiku-4.5";

const SYSTEM = `Eres quien redacta la "Carta del Tiempo" del programa Cápsula del Tiempo del HUB Startidea: el recuerdo escrito que la persona invitada se lleva tras vivir su experiencia.

Escribe una carta DIRIGIDA A LA PERSONA (segunda persona, tuteo), cálida y honesta, que recoja lo esencial de lo que compartió: su historia, sus recuerdos, lo que le importa, lo que sintió en la sesión.

Tono: emotivo pero SOBRIO (nada cursi ni grandilocuente), cercano, presente. Frases con aire. Honestidad relacional: con delicadeza, puedes recordarle que lo vivido aquí es un espejo de lo que ya lleva dentro y de quienes le quieren —no un sustituto—. No firmes como un humano concreto: es la voz cuidadosa de la experiencia. Entre 150 y 300 palabras. Sin encabezados ni markdown: solo la carta, lista para leer o imprimir.`;

export async function POST(req: Request) {
  if (!(await hasRole(["ADMIN"]))) return Response.json({ error: "no autorizado" }, { status: 403 });
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return Response.json({ error: "OPENROUTER_API_KEY no configurada" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { sessionId?: string; cartaNotas?: string } | null;
  if (!body?.sessionId) return Response.json({ error: "falta sessionId" }, { status: 400 });

  const s = await prisma.capsulaSession.findUnique({ where: { id: body.sessionId } });
  if (!s) return Response.json({ error: "sesión no encontrada" }, { status: 404 });

  const cartaNotas = (body.cartaNotas ?? s.cartaNotas ?? "").trim();
  const guion = Array.isArray(s.guion)
    ? (s.guion as Array<{ texto?: string }>).map((g) => g?.texto).filter(Boolean).join(" / ")
    : "";

  const openrouter = createOpenRouter({ apiKey });
  const prompt = `Redacta la Carta del Tiempo para esta persona.

Nombre: ${s.guestName || "(sin nombre)"}
Quién es / su contexto: ${s.guestContext}
Lo que se vivió en la sesión (guion): ${guion}
Notas del entrevistador sobre lo que pasó y lo que la persona compartió: ${cartaNotas || "(sin notas; básate en el contexto)"}

Devuelve solo la carta.`;

  let text = "";
  try {
    const r = await generateText({
      model: openrouter.chat(MODEL),
      system: SYSTEM,
      prompt,
      temperature: 0.85,
      maxOutputTokens: 900,
    });
    text = r.text.trim();
  } catch (e) {
    return Response.json({ error: "fallo de la IA", detail: e instanceof Error ? e.message : "" }, { status: 502 });
  }
  if (!text) return Response.json({ error: "carta vacía" }, { status: 502 });

  await prisma.capsulaSession.update({
    where: { id: s.id },
    data: { carta: text, ...(body.cartaNotas !== undefined ? { cartaNotas } : {}) },
  });
  return Response.json({ carta: text });
}
