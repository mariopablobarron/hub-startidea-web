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
