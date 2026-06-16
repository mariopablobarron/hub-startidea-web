import { hasRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { spotifyConfigured } from "@/lib/capsula/spotify";

/** GET /api/admin/spotify/status — ¿configurado? ¿conectado? (solo ADMIN) */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasRole(["ADMIN"]))) return Response.json({ error: "no autorizado" }, { status: 403 });
  const auth = await prisma.spotifyAuth.findUnique({ where: { id: "default" } });
  return Response.json({
    configured: spotifyConfigured(),
    connected: !!auth,
    displayName: auth?.displayName ?? null,
  });
}
