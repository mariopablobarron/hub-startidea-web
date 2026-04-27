// Datos de salas — m² del plano físico del local (C/ Conde Cifuentes 33).
// Los nombres comerciales (CC33, Serendipia, Sócrates) provienen del sitio
// actual hubstartidea.es. Capacidades estimadas a 1,5 m²/persona en mesa
// (escolar) y 0,8 m²/persona en cóctel — revisar con Mario antes de publicar.

export type RoomCategory = "sala" | "coworking" | "estudio" | "office" | "comun";

export type Room = {
  slug: string;
  name: string;
  subtitle: string;
  category: RoomCategory;
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
  /** Identificador en el plano (Aula 1..6, Biblioteca, etc.) */
  planLabel: string;
};

export const rooms: Room[] = [
  {
    slug: "cc33",
    name: "CC33",
    subtitle: "La sala grande del HUB",
    category: "sala",
    area: 47.3,
    capacity: { school: 30, theater: 50, coctel: 60 },
    short: "Aula amplia con luz natural para formaciones, presentaciones y eventos.",
    description:
      "Llamada así por la dirección que la vio nacer —Conde Cifuentes 33—, CC33 es la sala más versátil del HUB. Su superficie y mobiliario móvil permiten reconfigurarla en minutos: de aula con 30 puestos a auditorio para 50, o a evento con cóctel para 60 personas.",
    uses: ["Formación", "Presentaciones", "Eventos", "Asambleas", "Talleres"],
    equipment: [
      "Proyector + pantalla grande",
      "Wifi de fibra simétrica",
      "Mesas y sillas reconfigurables",
      "Climatización",
      "Acceso a zona de café",
    ],
    highlight: "Más solicitada",
    planLabel: "Aula 6",
  },
  {
    slug: "serendipia",
    name: "Serendipia",
    subtitle: "Sala de reuniones premium",
    category: "sala",
    area: 23.58,
    capacity: { school: 12, theater: 20, boardroom: 12 },
    short: "Reuniones de equipo, sesiones estratégicas y grabaciones de calidad.",
    description:
      "El nombre lo dice: el espacio donde aparecen las ideas que no buscabas. Mesa central para reuniones de hasta 12 personas, pantalla interactiva y videoconferencia preparada.",
    uses: ["Reuniones", "Mentorías", "Workshops íntimos", "Videoconferencias"],
    equipment: [
      "Pantalla grande interactiva",
      "Sistema de videollamada",
      "Pizarra",
      "Wifi de fibra",
    ],
    planLabel: "Biblioteca / Sala alumnos",
  },
  {
    slug: "socrates",
    name: "Sócrates",
    subtitle: "Aula de formación",
    category: "sala",
    area: 45.2,
    capacity: { school: 28, theater: 45 },
    short: "Aula configurada para clases, cursos y programas formativos.",
    description:
      "Aula con disposición tradicional preparada para impartir formación reglada y no reglada. Pizarra, proyector y mobiliario escolar móvil. Ideal para cursos de varias jornadas.",
    uses: ["Cursos", "Másters", "Programas formativos", "Bootcamps"],
    equipment: [
      "Proyector + pantalla",
      "Pizarra",
      "Mobiliario escolar móvil",
      "Wifi de fibra",
    ],
    planLabel: "Aula 2",
  },
  {
    slug: "aula-3",
    name: "Aula 3",
    subtitle: "Formación + grupos medianos",
    category: "sala",
    area: 40.33,
    capacity: { school: 24, theater: 36 },
    short: "Tercera aula del HUB para sesiones de grupo o trabajo por equipos.",
    description:
      "Espacio diáfano para cursos, trabajo en equipo o sesiones colaborativas. Especialmente útil cuando hay programas formativos en paralelo y se necesitan dos aulas activas a la vez.",
    uses: ["Cursos", "Talleres", "Sesiones colaborativas"],
    equipment: ["Proyector", "Pizarra", "Wifi de fibra", "Climatización"],
    planLabel: "Aula 3",
  },
  {
    slug: "aula-1",
    name: "Aula 1",
    subtitle: "Eventos y comunidad",
    category: "sala",
    area: 45.95,
    capacity: { school: 28, theater: 50, coctel: 55 },
    short: "Sala diáfana en planta baja con acceso directo desde la entrada.",
    description:
      "Junto a la recepción, esta sala es la elegida para eventos abiertos al público, encuentros de comunidad y actividades que requieren un acceso fluido para asistentes externos.",
    uses: ["Eventos", "Encuentros", "Networking", "Asambleas"],
    equipment: ["Proyector", "Pantalla", "Wifi de fibra", "Mobiliario móvil"],
    planLabel: "Aula 1",
  },
  {
    slug: "estudio-podcast",
    name: "Estudio podcast",
    subtitle: "Grabación y radio",
    category: "estudio",
    area: 13.0,
    capacity: { school: 0, theater: 0, boardroom: 4 },
    short: "Estudio totalmente equipado para podcast, radio y vídeo entrevista.",
    description:
      "Hogar de Granada Social y de los proyectos sonoros del HUB. Mesa de mezclas, micrófonos profesionales y tratamiento acústico para grabar episodios listos para publicar.",
    uses: ["Podcast", "Radio", "Voiceover", "Entrevistas en vídeo"],
    equipment: [
      "Mesa de mezclas",
      "4 micros profesionales",
      "Tratamiento acústico",
      "Cámara y luz para vídeo",
    ],
    highlight: "Granada Social",
    planLabel: "Aula 5",
  },
  {
    slug: "coworking-open",
    name: "Coworking abierto",
    subtitle: "Puestos flexibles",
    category: "coworking",
    area: 23.77,
    capacity: { school: 12, theater: 0 },
    short: "Puestos hot-desk con luz natural, café y comunidad.",
    description:
      "El corazón cotidiano del HUB. Puestos flexibles para trabajar por horas, días o meses, con todo lo que necesitas: fibra simétrica, café ilimitado, impresora y una comunidad de profesionales con los que cruzarte cada mañana.",
    uses: ["Trabajo individual", "Estancias largas", "Día puntual"],
    equipment: [
      "Fibra simétrica",
      "Café ilimitado",
      "Impresora",
      "Taquillas",
      "Zona de descanso",
    ],
    planLabel: "Pasillo 2 / Zona común",
  },
  {
    slug: "office-privado",
    name: "Office privado",
    subtitle: "Despacho cerrado",
    category: "office",
    area: 13.71,
    capacity: { school: 4, theater: 0, boardroom: 4 },
    short: "Despacho cerrado para equipos pequeños o consultas privadas.",
    description:
      "Espacio cerrado y aislado para equipos de hasta 4 personas, consultas con clientes o trabajo que requiere confidencialidad. Acceso a todos los servicios del HUB.",
    uses: ["Equipo pequeño", "Consultas", "Trabajo confidencial"],
    equipment: ["Mesa de trabajo", "Wifi de fibra", "Acceso 24/7 (a convenir)"],
    planLabel: "Sala Profesores / Administración",
  },
];

export function getRoom(slug: string): Room | undefined {
  return rooms.find((r) => r.slug === slug);
}

export const totalArea = Math.round(
  rooms.reduce((sum, r) => sum + r.area, 0),
);
