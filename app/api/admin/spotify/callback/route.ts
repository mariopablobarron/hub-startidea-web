import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { spotifyConfigured, spotifyRedirectUri } from "@/lib/capsula/spotify";

/**
 * GET /api/admin/spotify/callback — Spotify devuelve aquí el "code".
 * Lo intercambia por tokens y los guarda (singleton SpotifyAuth).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await hasRole(["ADMIN"]))) return new Response("No autorizado", { status: 403 });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const dest = (q: string) => Response.redirect(new URL(`/admin/capsula/spotify?${q}`, req.url), 302);

  if (error || !code) return dest("error=denegado");
  if (!spotifyConfigured()) return new Response("Spotify no configurado", { status: 503 });

  const id = process.env.SPOTIFY_CLIENT_ID as string;
  const secret = process.env.SPOTIFY_CLIENT_SECRET as string;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: spotifyRedirectUri() }),
  }).catch(() => null);
  if (!res || !res.ok) return dest("error=token");

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
  };

  let displayName: string | null = null;
  try {
    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (me.ok) displayName = ((await me.json()) as { display_name?: string }).display_name ?? null;
  } catch {}

  const payload = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    scope: data.scope ?? null,
    displayName,
  };
  await prisma.spotifyAuth.upsert({
    where: { id: "default" },
    create: { id: "default", ...payload },
    update: payload,
  });
  return dest("ok=1");
}
