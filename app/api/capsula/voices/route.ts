import { NextResponse } from "next/server";
import { authorizeCapsulaRequest } from "@/lib/capsula/security";

/**
 * GET /api/capsula/voices — lista las voces disponibles en la cuenta
 * ElevenLabs del HUB, para el selector de voz del panel de Cápsula.
 *
 * Devuelve [{ id, name, labels }]. Cachea 1h (las voces cambian poco).
 * Sin API key configurada → 503 (la página lo maneja mostrando aviso).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await authorizeCapsulaRequest(request, null);
  if (!access) return NextResponse.json({ error: "no-autorizado" }, { status: 403 });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "elevenlabs-no-configurado" }, { status: 503 });
  }
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `elevenlabs ${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as {
      voices?: Array<{ voice_id: string; name: string; labels?: Record<string, string> }>;
    };
    const voices = (data.voices || []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      labels: v.labels || {},
    }));
    return NextResponse.json({ voices });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 502 },
    );
  }
}
