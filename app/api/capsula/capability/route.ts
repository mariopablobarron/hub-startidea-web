import { NextResponse } from "next/server";
import {
  issueCapsulaCapability,
  normalizeCapsulaSala,
} from "@/lib/capsula/capability";
import {
  authorizeCapsulaRequest,
  capsulaCapabilitySecret,
} from "@/lib/capsula/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await authorizeCapsulaRequest(request, null, { requireSameOrigin: true });
  if (!access) {
    return NextResponse.json({ error: "no-autorizado" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { sala?: unknown };
  const sala = normalizeCapsulaSala(body.sala);
  if (!sala) {
    return NextResponse.json({ error: "sala-invalida" }, { status: 400 });
  }
  const secret = capsulaCapabilitySecret();
  if (!secret) {
    return NextResponse.json({ error: "capability-secret-no-configurado" }, { status: 503 });
  }

  const { token, claims } = issueCapsulaCapability({ secret, sala });
  return NextResponse.json(
    { token, expiresAt: new Date(claims.exp * 1000).toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
