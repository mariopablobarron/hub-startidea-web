import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db/prisma";
import { musicPath } from "@/lib/capsula/recordings";
import { authorizeCapsulaRequest } from "@/lib/capsula/security";

/**
 * GET   — sirve la pista a ADMIN o capacidad music:read, con
 *         soporte Range para seek. Cacheable (la música no cambia).
 * DELETE — borra la pista (solo ADMIN).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeCapsulaRequest(req, "music:read");
  if (!access) return NextResponse.json({ error: "no-autorizado" }, { status: 403 });
  const { id } = await params;
  const t = await prisma.musicTrack.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "no encontrada" }, { status: 404 });

  const filePath = musicPath(t.filename);
  const st = await stat(filePath).catch(() => null);
  if (!st) return NextResponse.json({ error: "archivo ausente" }, { status: 404 });
  const size = st.size;

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
      if (start >= size || start > end) {
        return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      const stream = createReadStream(filePath, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": t.mime,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": t.mime,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeCapsulaRequest(req, null, { requireSameOrigin: true });
  if (!access) return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  const { id } = await params;
  const t = await prisma.musicTrack.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  await rm(musicPath(t.filename), { force: true }).catch(() => {});
  await prisma.musicTrack.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
