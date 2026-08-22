import { getCurrentUser } from "@/lib/auth/roles";
import {
  CAPSULA_CAPABILITY_COOKIE,
  capabilityHasScope,
  type CapsulaCapabilityClaims,
  type CapsulaScope,
  verifyCapsulaCapability,
} from "@/lib/capsula/capability";
import { isExactSameOrigin } from "@/lib/capsula/origin";

export type CapsulaAccess =
  | { kind: "admin" }
  | { kind: "capability"; claims: CapsulaCapabilityClaims };

export function capsulaCapabilitySecret(): string | null {
  const secret = process.env.AUTH_SECRET || "";
  return secret.length >= 32 ? secret : null;
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization") || "";
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(value);
  return match?.[1] ?? null;
}

export async function authorizeCapsulaRequest(
  request: Request,
  scope: CapsulaScope | null,
  options: { requireSameOrigin?: boolean } = {},
): Promise<CapsulaAccess | null> {
  if (options.requireSameOrigin && !isExactSameOrigin(request)) return null;

  const user = await getCurrentUser();
  if (user?.role === "ADMIN") return { kind: "admin" };
  if (!scope) return null;

  const secret = capsulaCapabilitySecret();
  const token = cookieValue(request, CAPSULA_CAPABILITY_COOKIE);
  if (!secret || !token) return null;
  const claims = verifyCapsulaCapability(token, secret);
  if (!claims || !capabilityHasScope(claims, scope)) return null;
  return { kind: "capability", claims };
}
