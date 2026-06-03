import contentJson from "@/data/content.json";

export type RoomCategory = "sala" | "coworking" | "estudio" | "office" | "comun";

export type Room = {
  slug: string;
  name: string;
  subtitle: string;
  category: RoomCategory;
  /** Si false, no se puede reservar por horas desde /reservar. */
  bookable?: boolean;
  area: number;
  capacity: {
    school: number;
    theater: number;
    boardroom?: number;
    coctel?: number;
  };
  short: string;
  description: string;
  uses: string[];
  equipment: string[];
  highlight?: string;
  planLabel: string;
  image: string;
};

export type Content = typeof contentJson;

export const content = contentJson as Content;

export const rooms = content.rooms as Room[];

/** Solo las salas reservables por horas (excluye coworking, aulas inactivas). */
export const bookableRooms = rooms.filter((r) => r.bookable !== false);

export function getRoom(slug: string): Room | undefined {
  return rooms.find((r) => r.slug === slug);
}

/** ¿Esta sala es reservable? */
export function isBookable(slug: string): boolean {
  const r = getRoom(slug);
  return !!r && r.bookable !== false;
}

export const totalArea = Math.round(rooms.reduce((s, r) => s + r.area, 0));

/**
 * Formatea metros cuadrados sin decimales para la UI pública.
 * Los datos en content.json mantienen la precisión real (ej. 47.3),
 * pero al renderizarlos al usuario se muestra siempre redondeado.
 */
export function formatArea(area: number): string {
  return String(Math.round(area));
}

// ============================================================
// Pago por transferencia
// ============================================================

export type BankTransfer = {
  enabled: boolean;
  holder: string;
  iban: string;
  bankName: string;
  instructions: string;
};

/** Datos bancarios para pago por transferencia (editables desde /admin). */
export const bankTransfer = (content as Content & { bankTransfer?: BankTransfer })
  .bankTransfer;

/**
 * ¿Hay datos bancarios listos para mostrar al cliente? Si no, el email
 * de transferencia avisa de que se enviarán los datos en breve.
 */
export function bankTransferReady(): boolean {
  return !!bankTransfer?.enabled && !!bankTransfer?.iban?.trim();
}

/**
 * Referencia corta y legible de una reserva, para usar como concepto de
 * la transferencia y para que el admin la cuadre con el ingreso recibido.
 */
export function bookingRef(id: string): string {
  return "HUB-" + id.slice(-6).toUpperCase();
}
