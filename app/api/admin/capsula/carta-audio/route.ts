import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/roles";

/**
 * POST /api/admin/capsula/carta-audio — convierte la "Carta del Tiempo" de una
 * sesión en audio narrado (ElevenLabs) para que la persona se lo lleve.
 * Solo ADMIN. Devuelve audio/mpeg en streaming para descargar.
 *
 * Body: { sessionId, voiceId }. A diferencia del TTS en vivo, aquí el texto es
 * largo (la carta entera), así que el límite es mayor.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "eleven_multilingual_v2";
const MAX_CHARS = 4000;

export async function POST(req: Request) {
  if (!(await hasRole(["ADMIN"]))) {
    return Response.json({ error: "no autorizado" }, { status: 403 });
  }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "elevenlabs-no-configurado" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { sessionId?: string; voiceId?: string } | null;
  if (!body?.sessionId || !body.voiceId) {
    return Response.json({ error: "faltan sessionId o voiceId" }, { status: 400 });
  }

  const s = await prisma.capsulaSession.findUnique({ where: { id: body.sessionId } });
  if (!s) return Response.json({ error: "sesión no encontrada" }, { status: 404 });
  if (!s.carta?.trim()) return Response.json({ error: "esta sesión no tiene carta todavía" }, { status: 409 });

  const text = s.carta.trim().slice(0, MAX_CHARS);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(body.voiceId)}`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: AbortSignal.timeout(55_000),
      },
    );
    if (!res.ok || !res.body) {
      const msg = await res.text().catch(() => "");
      return Response.json({ error: `elevenlabs ${res.status}`, detail: msg.slice(0, 200) }, { status: 502 });
    }
    const safeName = (s.guestName || "carta").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 40);
    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="carta-del-tiempo-${safeName}.mp3"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "error" }, { status: 502 });
  }
}
