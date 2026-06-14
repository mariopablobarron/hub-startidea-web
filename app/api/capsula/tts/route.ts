import { NextResponse } from "next/server";

/**
 * POST /api/capsula/tts — genera audio TTS con ElevenLabs.
 *
 * Body: { text, voiceId }. Devuelve audio/mpeg (mp3) en streaming.
 * Lo usa la experiencia Cápsula del Tiempo: el entrevistador escribe
 * un texto y elige una voz; el invitado (en las gafas) lo reproduce.
 *
 * Server-to-browser: la API key NUNCA sale al cliente, solo el audio.
 * Rate-limit ligero por longitud (máx 1000 chars) para no quemar
 * créditos por accidente.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "eleven_multilingual_v2"; // soporta español con calidad

/**
 * Guard de mismo-origen: el TTS consume créditos de ElevenLabs, así que
 * solo lo permitimos desde la propia web (la experiencia /capsula). No
 * rompe el flujo anónimo del invitado —el navegador envía Origin/Referer
 * en el fetch same-origin— pero corta llamadas directas con curl/scripts.
 * No es infalible (el header es falsificable) pero eleva la barrera frente
 * al abuso casual; el límite de 1000 chars es la segunda capa.
 */
function sameOrigin(req: Request): boolean {
  const host = req.headers.get("host") || "";
  if (!host) return false;
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  return origin.includes(host);
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "origen-no-permitido" }, { status: 403 });
  }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "elevenlabs-no-configurado" }, { status: 503 });
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-body" }, { status: 400 });
  }
  const text = (body.text || "").trim();
  const voiceId = (body.voiceId || "").trim();
  if (!text || !voiceId) {
    return NextResponse.json({ error: "faltan text o voiceId" }, { status: 400 });
  }
  if (text.length > 1000) {
    return NextResponse.json({ error: "texto demasiado largo (máx 1000)" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!res.ok || !res.body) {
      const msg = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `elevenlabs ${res.status}`, detail: msg.slice(0, 200) },
        { status: 502 },
      );
    }
    // Stream del audio mp3 directo al cliente.
    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 502 },
    );
  }
}
