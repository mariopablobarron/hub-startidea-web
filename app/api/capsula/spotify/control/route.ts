import { NextResponse } from "next/server";
import { getSpotifyAccessToken } from "@/lib/capsula/spotify";

/**
 * POST /api/capsula/spotify/control — controla la reproducción de Spotify desde
 * el panel (same-origin; usa el token guardado de la cuenta del HUB).
 * action: search | play | pause | next | previous. Para play/pause/next hace
 * falta un dispositivo Spotify activo (móvil/PC/altavoz con Spotify abierto).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(req: Request): boolean {
  const host = req.headers.get("host") || "";
  if (!host) return false;
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  return origin.includes(host);
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "origen-no-permitido" }, { status: 403 });
  const token = await getSpotifyAccessToken();
  if (!token) return NextResponse.json({ error: "spotify-no-conectado" }, { status: 409 });

  const { action, query, uri } = (await req.json().catch(() => ({}))) as {
    action?: string;
    query?: string;
    uri?: string;
  };
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    if (action === "search") {
      const r = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query || "")}&type=track&limit=8`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const d = (await r.json()) as { tracks?: { items?: Array<{ uri: string; name: string; artists?: { name: string }[] }> } };
      return NextResponse.json({
        tracks: (d.tracks?.items || []).map((t) => ({
          uri: t.uri,
          name: t.name,
          artist: (t.artists || []).map((a) => a.name).join(", "),
        })),
      });
    }

    let r: Response | null = null;
    if (action === "play") {
      r = await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: H,
        body: uri ? JSON.stringify({ uris: [uri] }) : undefined,
      });
    } else if (action === "pause") {
      r = await fetch("https://api.spotify.com/v1/me/player/pause", { method: "PUT", headers: H });
    } else if (action === "next") {
      r = await fetch("https://api.spotify.com/v1/me/player/next", { method: "POST", headers: H });
    } else if (action === "previous") {
      r = await fetch("https://api.spotify.com/v1/me/player/previous", { method: "POST", headers: H });
    } else {
      return NextResponse.json({ error: "acción desconocida" }, { status: 400 });
    }

    if (r && !r.ok) {
      if (r.status === 404) {
        return NextResponse.json(
          { error: "no-active-device", message: "Abre Spotify en un dispositivo (móvil, PC o altavoz) para poder controlarlo." },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: `spotify ${r.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "fallo de red con Spotify" }, { status: 502 });
  }
}
