import { NextResponse } from "next/server";
import {
  CAPSULA_CAPABILITY_COOKIE,
  verifyCapsulaCapability,
} from "@/lib/capsula/capability";
import {
  bearerToken,
  capsulaCapabilitySecret,
} from "@/lib/capsula/security";
import { isExactSameOrigin } from "@/lib/capsula/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isExactSameOrigin(request)) {
    return NextResponse.json({ error: "origen-no-permitido" }, { status: 403 });
  }
  const token = bearerToken(request);
  const secret = capsulaCapabilitySecret();
  const claims = token && secret ? verifyCapsulaCapability(token, secret) : null;
  if (!token || !claims) {
    return NextResponse.json({ error: "capacidad-invalida" }, { status: 403 });
  }

  const response = NextResponse.json(
    { ok: true, expiresAt: new Date(claims.exp * 1000).toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(CAPSULA_CAPABILITY_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/capsula",
    expires: new Date(claims.exp * 1000),
  });
  return response;
}
