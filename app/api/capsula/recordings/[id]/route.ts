import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/roles";
import { recordingPath } from "@/lib/capsula/recordings";

/**
 * GET /api/capsula/recordings/[id] — sirve una grabación (solo ADMIN).
 *
 * Soporta Range (HTTP 206) para que el reproductor de vídeo pueda hacer seek
 * sin descargar el archivo entero. ?dl=1 fuerza la descarga (attachment).
 * Las grabaciones son privadas: nunca se sirven sin sesión de admin.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasRole(["ADMIN"]))) {
    return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const rec = await prisma.recording.findUnique({ where: { id } });
  if (!rec) {
    return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  }

  const filePath = recordingPath(rec.filename);
  const st = await stat(filePath).catch(() => null);
  if (!st) {
    return NextResponse.json({ error: "archivo ausente" }, { status: 404 });
  }
  const size = st.size;
  const download = new URL(req.url).searchParams.get("dl") === "1";
  const disposition = `${download ? "attachment" : "inline"}; filename="${rec.filename}"`;

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
      if (start >= size || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      const stream = createReadStream(filePath, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": rec.mime,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Disposition": disposition,
          "Cache-Control": "private, no-store",
        },
      });
    }
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": rec.mime,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * DELETE /api/capsula/recordings/[id] — borra una grabación (solo ADMIN).
 * Borra el archivo del disco y el registro.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasRole(["ADMIN"]))) {
    return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  }
  const { id } = await params;
  const rec = await prisma.recording.findUnique({ where: { id } });
  if (!rec) {
    return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  }
  const { rm } = await import("node:fs/promises");
  await rm(recordingPath(rec.filename), { force: true }).catch(() => {});
  await prisma.recording.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
