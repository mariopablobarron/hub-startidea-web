import type { AccessType } from "@prisma/client";

/**
 * Etiquetas en español de cada tipo de acceso físico al HUB.
 * Módulo aparte de keyholders.ts porque ese es "use server" y solo
 * puede exportar funciones async (no constantes).
 */
export const ACCESS_LABEL: Record<AccessType, string> = {
  PHYSICAL_KEY: "Llave física",
  ALARM_CODE: "Código alarma",
  ACCESS_CARD: "Tarjeta proximidad",
  GARAGE_REMOTE: "Mando garaje",
  BUILDING_KEY: "Llave portal",
  OTHER: "Otro",
};
