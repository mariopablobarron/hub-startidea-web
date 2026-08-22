import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const CAPSULA_CAPABILITY_TTL_SECONDS = 2 * 60 * 60;
export const CAPSULA_CAPABILITY_COOKIE = "capsula_capability";

export const CAPSULA_GUEST_SCOPES = [
  "tts",
  "recording:create",
  "music:read",
] as const;

export type CapsulaScope = (typeof CAPSULA_GUEST_SCOPES)[number];

export type CapsulaCapabilityClaims = {
  v: 1;
  jti: string;
  sala: string;
  scopes: CapsulaScope[];
  iat: number;
  exp: number;
};

const ALLOWED_SCOPES = new Set<string>(CAPSULA_GUEST_SCOPES);

export function normalizeCapsulaSala(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const sala = value.trim();
  return /^[A-Za-z0-9_-]{1,40}$/.test(sala) ? sala : null;
}

function assertSecret(secret: string): void {
  if (secret.length < 32) throw new Error("CAPSULA_CAPABILITY_SECRET_TOO_SHORT");
}

function signatureFor(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret)
    .update("capsula-capability-v1\0")
    .update(payload)
    .digest();
}

export function issueCapsulaCapability(options: {
  secret: string;
  sala: string;
  nowMs?: number;
  ttlSeconds?: number;
  jti?: string;
}): { token: string; claims: CapsulaCapabilityClaims } {
  assertSecret(options.secret);
  const sala = normalizeCapsulaSala(options.sala);
  if (!sala) throw new Error("CAPSULA_INVALID_SALA");

  const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const ttl = options.ttlSeconds ?? CAPSULA_CAPABILITY_TTL_SECONDS;
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > CAPSULA_CAPABILITY_TTL_SECONDS) {
    throw new Error("CAPSULA_INVALID_TTL");
  }

  const claims: CapsulaCapabilityClaims = {
    v: 1,
    jti: options.jti ?? randomUUID(),
    sala,
    scopes: [...CAPSULA_GUEST_SCOPES],
    iat: now,
    exp: now + ttl,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signatureFor(payload, options.secret).toString("base64url");
  return { token: `${payload}.${signature}`, claims };
}

export function verifyCapsulaCapability(
  token: string,
  secret: string,
  nowMs: number = Date.now(),
): CapsulaCapabilityClaims | null {
  if (secret.length < 32 || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  let provided: Buffer;
  try {
    provided = Buffer.from(parts[1], "base64url");
  } catch {
    return null;
  }
  const expected = signatureFor(parts[0], secret);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!claims || typeof claims !== "object") return null;
  const c = claims as Partial<CapsulaCapabilityClaims>;
  const now = Math.floor(nowMs / 1000);
  if (
    c.v !== 1 ||
    typeof c.jti !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(c.jti) ||
    !normalizeCapsulaSala(c.sala) ||
    !Array.isArray(c.scopes) ||
    c.scopes.length === 0 ||
    !c.scopes.every((scope) => typeof scope === "string" && ALLOWED_SCOPES.has(scope)) ||
    !Number.isInteger(c.iat) ||
    !Number.isInteger(c.exp) ||
    (c.iat as number) > now + 60 ||
    (c.exp as number) <= now ||
    (c.exp as number) - (c.iat as number) > CAPSULA_CAPABILITY_TTL_SECONDS
  ) {
    return null;
  }
  return c as CapsulaCapabilityClaims;
}

export function capabilityHasScope(
  claims: CapsulaCapabilityClaims,
  scope: CapsulaScope,
): boolean {
  return claims.scopes.includes(scope);
}
