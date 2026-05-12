// Rate limit en memoria por IP. Para escala pequeña (web pública con tráfico
// moderado) basta — Coolify corre un único proceso Node persistente. Para
// múltiples réplicas habría que mover a Redis, pero hoy no es el caso.

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_PER_WINDOW = 3; // 3 envíos por IP en 10 min

export function rateLimit(ip: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || entry.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true };
}

// Limpieza ocasional para que Map no crezca indefinidamente. Se ejecuta
// cuando se llama tras la 100ª entrada. Suficiente para un site público.
let calls = 0;
export function maybeSweep() {
  if (++calls % 100 !== 0) return;
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt < now) store.delete(k);
  }
}
