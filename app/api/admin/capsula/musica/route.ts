import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/roles";
import { MUSIC_DIR, MAX_MUSIC_BYTES, ALLOWED_MUSIC_MIME, musicPath } from "@/lib/capsula/recordings";

/**
 * Biblioteca de música de la Cápsula del Tiempo (solo ADMIN).
 * GET  — lista las pistas. POST — sube una pista (streaming a disco).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasRole(["ADMIN"]))) {
    return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  }
  const tracks = await prisma.musicTrack.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({
    tracks: tracks.map((t) => ({ id: t.id, title: t.title, mime: t.mime, sizeBytes: t.sizeBytes })),
  });
}

export async function POST(req: Request) {
  if (!(await hasRole(["ADMIN"]))) {
    return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  }
  if (!req.body) return NextResponse.json({ error: "sin cuerpo" }, { status: 400 });

  const url = new URL(req.url);
  const title = (url.searchParams.get("title") || "Pista").slice(0, 160);
  const mime = url.searchParams.get("mime") || req.headers.get("content-type") || "audio/mpeg";
  if (!ALLOWED_MUSIC_MIME.some((m) => mime.startsWith(m))) {
    return NextResponse.json({ error: "tipo no permitido", mime }, { status: 415 });
  }
  const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : mime.includes("webm") ? "webm" : "mp3";
  const filename = `track-${crypto.randomUUID()}.${ext}`;
  const filePath = musicPath(filename);
  await mkdir(MUSIC_DIR, { recursive: true });

  let bytes = 0;
  let tooBig = false;
  const ws = createWriteStream(filePath);
  try {
    const reader = Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]);
    for await (const chunk of reader) {
      bytes += (chunk as Buffer).length;
      if (bytes > MAX_MUSIC_BYTES) { tooBig = true; reader.destroy(); break; }
      if (!ws.write(chunk)) await new Promise<void>((res) => ws.once("drain", () => res()));
    }
    ws.end();
    await new Promise<void>((res, rej) => { ws.on("finish", () => res()); ws.on("error", rej); });
  } catch {
    ws.destroy();
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: "fallo al escribir" }, { status: 500 });
  }
  if (tooBig) {
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: "pista demasiado grande (máx 30 MB)" }, { status: 413 });
  }
  if (!bytes) {
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: "pista vacía" }, { status: 400 });
  }

  const t = await prisma.musicTrack.create({ data: { title, filename, mime, sizeBytes: bytes } });
  return NextResponse.json({ id: t.id, title: t.title });
}
