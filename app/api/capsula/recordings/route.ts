import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db/prisma";
import { normalizeCapsulaSala } from "@/lib/capsula/capability";
import { capsulaQuotaStore } from "@/lib/capsula/quota";
import { authorizeCapsulaRequest } from "@/lib/capsula/security";
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
 * El invitado usa una capacidad de corta duración entregada por el host
 * autenticado. Las grabaciones NUNCA son públicas.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const access = await authorizeCapsulaRequest(req, "recording:create", {
    requireSameOrigin: true,
  });
  if (!access) return NextResponse.json({ error: "no-autorizado" }, { status: 403 });
  if (!req.body) {
    return NextResponse.json({ error: "sin cuerpo" }, { status: 400 });
  }

  const url = new URL(req.url);
  const sala = normalizeCapsulaSala(url.searchParams.get("sala") || "estudio");
  if (!sala) return NextResponse.json({ error: "sala-invalida" }, { status: 400 });
  if (access.kind === "capability" && access.claims.sala !== sala) {
    return NextResponse.json({ error: "sala-no-autorizada" }, { status: 403 });
  }
  const kind = url.searchParams.get("kind") === "audio" ? "AUDIO" : "VIDEO";
  const mime = url.searchParams.get("mime") || req.headers.get("content-type") || "video/webm";
  const durRaw = parseInt(url.searchParams.get("dur") || "", 10);
  const durationSec = Number.isFinite(durRaw) && durRaw > 0 ? Math.min(durRaw, 86400) : null;

  if (!ALLOWED_RECORDING_MIME.some((m) => mime.startsWith(m))) {
    return NextResponse.json({ error: "tipo no permitido", mime }, { status: 415 });
  }
  if (
    access.kind === "capability" &&
    !capsulaQuotaStore.reserveRecording(access.claims.jti, access.claims.exp * 1000)
  ) {
    return NextResponse.json({ error: "cuota-grabaciones-agotada" }, { status: 429 });
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
  if (
    access.kind === "capability" &&
    !capsulaQuotaStore.commitRecordingBytes(
      access.claims.jti,
      bytes,
      access.claims.exp * 1000,
    )
  ) {
    await rm(filePath, { force: true }).catch(() => {});
    return NextResponse.json({ error: "cuota-bytes-agotada" }, { status: 429 });
  }

  const rec = await prisma.recording.create({
    data: { sala, kind, mime, filename, sizeBytes: bytes, durationSec },
  });
  return NextResponse.json({ id: rec.id, sizeBytes: bytes });
}
