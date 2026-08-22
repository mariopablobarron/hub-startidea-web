import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authorizeCapsulaRequest } from "@/lib/capsula/security";

/**
 * GET /api/capsula/musica — lista las pistas (id + título) para el reproductor
 * del panel del entrevistador. Solo ADMIN.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const access = await authorizeCapsulaRequest(req, null);
  if (!access) return NextResponse.json({ error: "no-autorizado" }, { status: 403 });
  const tracks = await prisma.musicTrack.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, title: true },
  });
  return NextResponse.json({ tracks }, { headers: { "Cache-Control": "no-store" } });
}
