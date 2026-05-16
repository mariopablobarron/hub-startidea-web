import { PrismaClient, Role, PricingUnit } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seed inicial — solo se ejecuta una vez en deploy fresh. Idempotente
 * (usa upsert para no duplicar si se corre dos veces).
 *
 * 1. Crea usuario admin Mario con ADMIN role.
 * 2. Pricing inicial con valores placeholder para las 8 salas. Mario
 *    los ajusta luego desde /admin/tarifas.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mario@startidea.es";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me-immediately";

// Tarifas placeholder por sala — Mario las ajusta desde admin después.
// Estructura: [roomSlug, [PER_HOUR_client, HALF_DAY_client, FULL_DAY_client]]
// MEMBER y COLLABORATOR se calculan con descuentos en runtime.
const PRICING_PLACEHOLDERS: Array<{
  roomSlug: string;
  units: Array<{ unit: PricingUnit; clientCents: number }>;
}> = [
  { roomSlug: "cc33",          units: [{ unit: "PER_HOUR", clientCents: 4500 }, { unit: "HALF_DAY", clientCents: 16000 }, { unit: "FULL_DAY", clientCents: 28000 }, { unit: "EVENT", clientCents: 45000 }] },
  { roomSlug: "serendipia",    units: [{ unit: "PER_HOUR", clientCents: 2500 }, { unit: "HALF_DAY", clientCents: 9000 },  { unit: "FULL_DAY", clientCents: 15000 }] },
  { roomSlug: "socrates",      units: [{ unit: "PER_HOUR", clientCents: 1800 }, { unit: "HALF_DAY", clientCents: 6500 },  { unit: "FULL_DAY", clientCents: 11000 }] },
  { roomSlug: "aula-1",        units: [{ unit: "PER_HOUR", clientCents: 2200 }, { unit: "HALF_DAY", clientCents: 8000 },  { unit: "FULL_DAY", clientCents: 13500 }] },
  { roomSlug: "aula-3",        units: [{ unit: "PER_HOUR", clientCents: 2200 }, { unit: "HALF_DAY", clientCents: 8000 },  { unit: "FULL_DAY", clientCents: 13500 }] },
  { roomSlug: "estudio-podcast", units: [{ unit: "PER_HOUR", clientCents: 3500 }, { unit: "PER_SESSION", clientCents: 9000 }] },
  { roomSlug: "coworking-open",  units: [{ unit: "PER_DAY", clientCents: 1800 }] },
  { roomSlug: "office-privado",  units: [{ unit: "PER_DAY", clientCents: 5500 }] },
];

async function main() {
  console.log("[seed] start");

  // 1. Admin
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: "Mario Pablo Barrón",
      role: Role.ADMIN,
      passwordHash,
      emailVerified: new Date(),
    },
    update: { role: Role.ADMIN },
  });
  console.log(`[seed] admin: ${admin.email} (id=${admin.id})`);

  // 2. Pricing placeholder
  for (const room of PRICING_PLACEHOLDERS) {
    for (const u of room.units) {
      await prisma.pricing.upsert({
        where: { roomSlug_unit: { roomSlug: room.roomSlug, unit: u.unit } },
        create: {
          roomSlug: room.roomSlug,
          unit: u.unit,
          clientCents: u.clientCents,
          // MEMBER por defecto = 30% descuento sobre client
          memberCents: Math.round(u.clientCents * 0.7),
          // COLLABORATOR por defecto = 20% descuento sobre client
          collaboratorCents: Math.round(u.clientCents * 0.8),
          active: true,
        },
        update: {}, // No sobrescribir si ya existe (Mario puede haberlas ajustado)
      });
    }
  }
  console.log(`[seed] pricing: ${PRICING_PLACEHOLDERS.length} salas con tarifas placeholder`);

  console.log("[seed] done");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[seed] FAIL", e);
    await prisma.$disconnect();
    process.exit(1);
  });
