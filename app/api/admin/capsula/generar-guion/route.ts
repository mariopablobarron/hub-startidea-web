import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/roles";

/**
 * POST /api/admin/capsula/generar-guion — la IA diseña un guion personalizado
 * para una sesión de la Cápsula del Tiempo a partir del contexto del invitado.
 *
 * Solo ADMIN. Devuelve un guion estructurado [{ fase, texto }] y guarda (o
 * actualiza) una CapsulaSession. El guion se usa luego en vivo en
 * /capsula?host=1&sesion=<id>.
 *
 * Modelo configurable con CAPSULA_MODEL (default haiku 4.5, barato y solvente;
 * sube a anthropic/claude-sonnet-4.5 para guiones más finos).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.CAPSULA_MODEL || "anthropic/claude-haiku-4.5";

const SYSTEM = `Eres el guionista experto del programa "Cápsula del Tiempo" del HUB Startidea: una experiencia inmersiva (gafas VR) socioemocional donde una persona invitada vive un viaje guiado por un entrevistador. Tu trabajo es preparar, a partir del contexto del invitado, un GUION a medida que el entrevistador lanzará en vivo (cada frase se reproduce con voz para el invitado).

Principios irrenunciables:
- Calidez y respeto absolutos. Tono cercano, humano, pausado. Tuteas.
- Frases CORTAS, para ser DICHAS en voz alta (no leídas). Una idea por frase.
- Nunca invasivo ni terapéutico-clínico. No diagnosticas ni prometes curar.
- Honestidad relacional: la experiencia acompaña, NO sustituye a las personas que quieren al invitado. Si procede, recuérdalo con delicadeza.
- Adapta lenguaje y ritmo al público (joven, adulto, mayor) y al motivo (entrevista, relajación, reflexión, presencia/soledad, recuerdos, reír/llorar).
- Personaliza con lo que sepas del invitado (nombre, vivencias), sin inventar datos sensibles que no te hayan dado.
- Deja espacio al silencio: incluye frases que inviten a no responder ya.

Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto alrededor) con esta forma:
{
  "tituloSesion": "string corto",
  "ambienteSugerido": "uno de: granada | infancia | verano | general | abrazo | simbolos",
  "guion": [
    { "fase": "apertura", "texto": "..." },
    { "fase": "historia", "texto": "..." },
    { "fase": "pregunta", "texto": "..." },
    { "fase": "reflexion", "texto": "..." },
    { "fase": "cierre", "texto": "..." }
  ]
}
El array "guion" debe tener entre 8 y 16 entradas, en el orden en que se dirían, combinando las fases según el propósito. Cada "texto" es una sola frase o pregunta lista para decir.`;

type GuionItem = { fase: string; texto: string };

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("sin JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function POST(req: Request) {
  if (!(await hasRole(["ADMIN"]))) {
    return Response.json({ error: "no autorizado" }, { status: 403 });
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENROUTER_API_KEY no configurada" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    sessionId?: string;
    sala?: string;
    guestName?: string;
    guestContext?: string;
    modoBase?: string;
    transcript?: Array<{ role: string; content: string }>;
  } | null;
  if (!body) return Response.json({ error: "bad body" }, { status: 400 });

  const guestContext = (body.guestContext || "").trim();
  const convo = (body.transcript || [])
    .map((m) => `${m.role === "user" ? "Entrevistador" : "Asistente"}: ${m.content}`)
    .join("\n")
    .slice(0, 6000);
  if (!guestContext && !convo) {
    return Response.json({ error: "falta contexto del invitado" }, { status: 400 });
  }

  const openrouter = createOpenRouter({ apiKey });
  const prompt = `Diseña el guion para esta sesión.

Invitado: ${body.guestName || "(sin nombre)"}
Propósito / modo base: ${body.modoBase || "(libre, decide tú según el contexto)"}

Contexto aportado por el entrevistador:
${guestContext || "(ver conversación)"}

${convo ? `Conversación de preparación:\n${convo}\n` : ""}
Devuelve solo el JSON.`;

  let result;
  try {
    result = await generateText({
      model: openrouter.chat(MODEL),
      system: SYSTEM,
      prompt,
      temperature: 0.8,
      maxOutputTokens: 1800,
    });
  } catch (e) {
    return Response.json(
      { error: "fallo de la IA", detail: e instanceof Error ? e.message : "" },
      { status: 502 },
    );
  }

  let parsed: { tituloSesion?: string; ambienteSugerido?: string; guion?: GuionItem[] };
  try {
    parsed = extractJson(result.text) as typeof parsed;
  } catch {
    return Response.json({ error: "la IA no devolvió un guion válido", raw: result.text.slice(0, 400) }, { status: 502 });
  }
  const guion = Array.isArray(parsed.guion)
    ? parsed.guion.filter((g) => g && typeof g.texto === "string" && g.texto.trim()).map((g) => ({ fase: String(g.fase || "frase"), texto: g.texto.trim() }))
    : [];
  if (!guion.length) {
    return Response.json({ error: "guion vacío" }, { status: 502 });
  }

  const data = {
    sala: (body.sala || "estudio").slice(0, 40),
    guestName: body.guestName?.slice(0, 120) || null,
    guestContext: guestContext || convo.slice(0, 2000),
    modoBase: body.modoBase || null,
    ambiente: parsed.ambienteSugerido || null,
    guion,
    transcript: body.transcript ? (body.transcript as unknown as object) : undefined,
  };

  const saved = body.sessionId
    ? await prisma.capsulaSession.update({ where: { id: body.sessionId }, data })
    : await prisma.capsulaSession.create({ data });

  return Response.json({
    id: saved.id,
    tituloSesion: parsed.tituloSesion || "Sesión Cápsula del Tiempo",
    ambiente: saved.ambiente,
    guion,
  });
}
