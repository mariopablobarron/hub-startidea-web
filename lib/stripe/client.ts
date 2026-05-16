import Stripe from "stripe";

/**
 * Cliente Stripe singleton — instanciación perezosa para no crashear el
 * build cuando STRIPE_SECRET_KEY no está configurada (preview/dev).
 *
 * Reutilizamos la cuenta Stripe de Mario (compartida con luciérnaga,
 * raizyaccion, pixan-breathwork, merch). Es la misma cuenta porque es
 * el mismo merchant; cada app crea sus propios Checkout Sessions y los
 * webhooks distinguen por endpoint URL (cada app tiene su webhook
 * secret propio, no se reutiliza).
 */

let _client: Stripe | null = null;

export function getStripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no configurada");
  _client = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
  return _client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Catálogo de bonos prepago. Precios en céntimos.
 * Cuando crezca, mover a tabla `BondCatalog` en BD.
 */
export const BOND_CATALOG = [
  {
    type: "ROOM_HOURS_10" as const,
    name: "Bono 10 horas de sala",
    description: "10h en cualquier sala del HUB. Caduca a 90 días.",
    hoursTotal: 10,
    priceCents: 18000,
    expirationDays: 90,
  },
  {
    type: "ROOM_HOURS_50" as const,
    name: "Bono 50 horas de sala",
    description: "50h en cualquier sala. Mejor precio por hora. Caduca a 180 días.",
    hoursTotal: 50,
    priceCents: 75000,
    expirationDays: 180,
  },
  {
    type: "PODCAST_SESSIONS_5" as const,
    name: "Bono 5 sesiones de podcast",
    description: "5 sesiones de 2h en el estudio de podcast. Caduca a 120 días.",
    hoursTotal: 10,
    priceCents: 35000,
    expirationDays: 120,
  },
  {
    type: "COWORKING_DAYS_10" as const,
    name: "Bono 10 días de coworking",
    description: "10 días de plaza flex. Caduca a 90 días.",
    hoursTotal: 80, // 8h × 10 días
    priceCents: 15000,
    expirationDays: 90,
  },
];

export type BondCatalogItem = (typeof BOND_CATALOG)[number];
