/**
 * Rate limiter en memoria del proceso. Suficiente para 1 instancia (Coolify v3
 * no tiene autoscaling de Next, así que con 1 contenedor vale).
 *
 * Si en el futuro escalamos a varias réplicas, migrar a Upstash Redis.
 */

type Bucket = {
  /** timestamps unix ms de cada request en la ventana */
  hits: number[];
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds?: number;
  reason?: "minute" | "hour";
};

const PER_MINUTE = 5;
const PER_HOUR = 30;

export function checkRateLimit(fingerprint: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(fingerprint) ?? { hits: [] };
  // limpia >1h
  bucket.hits = bucket.hits.filter((t) => now - t < 60 * 60 * 1000);

  const last1m = bucket.hits.filter((t) => now - t < 60 * 1000).length;
  if (last1m >= PER_MINUTE) {
    return { ok: false, remaining: 0, retryAfterSeconds: 60, reason: "minute" };
  }
  if (bucket.hits.length >= PER_HOUR) {
    const oldest = bucket.hits[0];
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldest + 60 * 60 * 1000 - now) / 1000),
      reason: "hour",
    };
  }

  bucket.hits.push(now);
  buckets.set(fingerprint, bucket);
  return { ok: true, remaining: PER_HOUR - bucket.hits.length };
}

export function fingerprintFrom(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || request.headers.get("x-real-ip") || "anon";
  const ua = request.headers.get("user-agent") || "";
  // Hash simple para no logear IPs en claro (GDPR-friendlier).
  return simpleHash(`${ip}::${ua}`);
}

function simpleHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}
