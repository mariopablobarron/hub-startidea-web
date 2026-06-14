import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db/prisma";
import {
  RECORDINGS_DIR,
  MAX_RECORDING_BYTES,
  ALLOWED_RECORDING_MIME,
  recordingPath,
} from "@/lib/capsula/recordings";

/**
 * POST /api/capsula/recordings — sube una grabación de la Cápsula del Tiempo.
 *
 * El body es el blob (audio/vídeo webm) que el invitado generó en su navegador.
 * Se escribe en STREAMING a disco (el contenedor solo tiene 768 MB: nunca
 * bufferizamos el archivo entero en memoria) contando bytes para cortar si
 * supera el límite. Metadatos por query: ?sala=&kind=audio|video&dur=&mime=.
 *
 * Guard de mismo-origen (el invitado es anónimo, no puede autenticarse): solo
 * se acepta desde la propia web. Las grabaciones NUNCA son públicas.
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
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "origen-no-permitido" }, { status: 403 });
  }
  if (!req.body) {
    return NextResponse.json({ error: "sin cuerpo" }, { status: 400 });
  }

  const url = new URL(req.url);
  const sala =
    (url.searchParams.get("sala") || "estudio").slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "") ||
    "estudio";
  const kind = url.searchParams.get("kind") === "audio" ? "AUDIO" : "VIDEO";
  const mime = url.searchParams.get("mime") || req.headers.get("content-type") || "video/webm";
  const durRaw = parseInt(url.searchParams.get("dur") || "", 10);
  const durationSec = Number.isFinite(durRaw) && durRaw > 0 ? Math.min(durRaw, 86400) : null;

  if (!ALLOWED_RECORDING_MIME.some((m) => mime.startsWith(m))) {
    return NextResponse.json({ error: "tipo no permitido", mime }, { status: 415 });
  }

  const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
  const filename = `capsula-${sala}-${crypto.randomUUID()}.${ext}`;
  const filePath = recordingPath(filename);

  await mkdir(RECORDINGS_DIR, { recursive: true });

  let bytes = 0;
  let tooBig = false;
  const ws = createWriteStream(filePath);
  try {
    const reader = Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]);
    for await (const chunk of reader) {
      bytes += (chunk as Buffer).length;
      if (bytes > MAX_RECORDING_BYTES) {
        tooBig = true;
        reader.destroy();
        break;
      }
      if (!ws.write(chunk)) {
        await new Promise<void>((res) => ws.once("drain", () => res()));
      }
    }
    ws.end();
    await new Promise<void>((res, rej) => {
      ws.on("finish", () => res());
      ws.on("error", rej);
    });
  } catch {
    ws.destroy();
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: "fallo al escribir" }, { status: 500 });
  }

  if (tooBig) {
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: "grabación demasiado grande" }, { status: 413 });
  }
  if (bytes === 0) {
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: "grabación vacía" }, { status: 400 });
  }

  const rec = await prisma.recording.create({
    data: { sala, kind, mime, filename, sizeBytes: bytes, durationSec },
  });
  return NextResponse.json({ id: rec.id, sizeBytes: bytes });
}
