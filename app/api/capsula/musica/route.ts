import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/capsula/musica — lista las pistas (id + título) para el reproductor
 * del panel del entrevistador. Same-origin (el host no está logueado como
 * admin). Solo metadatos no sensibles.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(req: Request): boolean {
  const host = req.headers.get("host") || "";
  if (!host) return false;
  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  return origin.includes(host);
}

export async function GET(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "origen-no-permitido" }, { status: 403 });
  }
  const tracks = await prisma.musicTrack.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, title: true },
  });
  return NextResponse.json({ tracks }, { headers: { "Cache-Control": "no-store" } });
}
