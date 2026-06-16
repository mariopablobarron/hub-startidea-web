import { hasRole } from "@/lib/auth/roles";
import { spotifyConfigured, spotifyRedirectUri, SPOTIFY_SCOPES } from "@/lib/capsula/spotify";

/**
 * GET /api/admin/spotify/login — inicia el OAuth de Spotify (solo ADMIN).
 * Redirige a la pantalla de autorización de Spotify.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasRole(["ADMIN"]))) return new Response("No autorizado", { status: 403 });
  if (!spotifyConfigured()) {
    return new Response("Spotify no configurado (faltan SPOTIFY_CLIENT_ID/SECRET en el servidor)", { status: 503 });
  }
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID as string,
    response_type: "code",
    redirect_uri: spotifyRedirectUri(),
    scope: SPOTIFY_SCOPES,
    show_dialog: "true",
  });
  return Response.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`, 302);
}
