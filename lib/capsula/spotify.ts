import { prisma } from "@/lib/db/prisma";

/**
 * Conexión con Spotify (cuenta única del HUB) para controlar la reproducción
 * desde el panel en sesiones presenciales. Authorization Code flow.
 *
 * SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET van en env (Coolify). El redirect
 * debe coincidir EXACTO con el registrado en developer.spotify.com.
 */
export const SPOTIFY_SCOPES =
  "user-modify-playback-state user-read-playback-state user-read-currently-playing";

export function spotifyConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function spotifyRedirectUri(): string {
  return process.env.SPOTIFY_REDIRECT_URI || "https://hubstartidea.es/api/admin/spotify/callback";
}

function basicAuth(): string {
  const id = process.env.SPOTIFY_CLIENT_ID || "";
  const secret = process.env.SPOTIFY_CLIENT_SECRET || "";
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

/** Access token válido (refresca si caducó). null si no conectado/configurado. */
export async function getSpotifyAccessToken(): Promise<string | null> {
  if (!spotifyConfigured()) return null;
  const auth = await prisma.spotifyAuth.findUnique({ where: { id: "default" } });
  if (!auth) return null;
  if (auth.expiresAt.getTime() > Date.now() + 30_000) return auth.accessToken;

  // Refrescar
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: auth.refreshToken }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
  const updated = await prisma.spotifyAuth.update({
    where: { id: "default" },
    data: {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    },
  });
  return updated.accessToken;
}
