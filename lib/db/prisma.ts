import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma singleton — patrón estándar para Next.js 15.
 * En dev, HMR puede crear múltiples instancias si no se cachea en globalThis,
 * lo que satura las conexiones de la BD.
 *
 * En producción Next ejecuta un único proceso por container, así que basta
 * con instanciar una vez al cargar el módulo.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
