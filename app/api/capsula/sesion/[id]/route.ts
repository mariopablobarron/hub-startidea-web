import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authorizeCapsulaRequest } from "@/lib/capsula/security";

/**
 * Sesión personalizada de la Cápsula del Tiempo.
 *
 * GET  — solo ADMIN: devuelve el guion + meta para el panel del entrevistador
 *        en vivo (/capsula?host=1&sesion=<id>). NO expone el contexto del
 *        invitado ni el transcript (datos sensibles), solo las frases a lanzar.
 * PATCH — solo ADMIN: edita el guion (ajustes del entrevistador) o la nota.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeCapsulaRequest(req, null);
  if (!access) return NextResponse.json({ error: "no-autorizado" }, { status: 403 });
  const { id } = await params;
  const s = await prisma.capsulaSession.findUnique({
    where: { id },
    select: { sala: true, ambiente: true, guion: true, guestName: true },
  });
  if (!s) return NextResponse.json({ error: "no encontrada" }, { status: 404 });
  return NextResponse.json(
    { sala: s.sala, ambiente: s.ambiente, guestName: s.guestName, guion: s.guion },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeCapsulaRequest(req, null, { requireSameOrigin: true });
  if (!access) return NextResponse.json({ error: "no autorizado" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    guion?: Array<{ fase?: string; texto?: string }>;
    note?: string;
    carta?: string;
    cartaNotas?: string;
  };
  const data: { guion?: object; note?: string; carta?: string; cartaNotas?: string } = {};
  if (Array.isArray(body.guion)) {
    data.guion = body.guion
      .filter((g) => g && typeof g.texto === "string" && g.texto.trim())
      .map((g) => ({ fase: String(g.fase || "frase"), texto: String(g.texto).trim() }));
  }
  if (typeof body.note === "string") data.note = body.note;
  if (typeof body.carta === "string") data.carta = body.carta;
  if (typeof body.cartaNotas === "string") data.cartaNotas = body.cartaNotas;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "nada que actualizar" }, { status: 400 });
  }
  const s = await prisma.capsulaSession.update({ where: { id }, data });
  return NextResponse.json({ ok: true, id: s.id });
}
