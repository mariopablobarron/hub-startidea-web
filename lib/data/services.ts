import type { LucideIcon } from "lucide-react";
import {
  Mic,
  GraduationCap,
  Users,
  Wifi,
  Coffee,
  Printer,
  Accessibility,
  Calendar,
} from "lucide-react";

export type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const services: Service[] = [
  {
    icon: Users,
    title: "Coworking",
    description:
      "Puestos flexibles en planta diáfana con luz natural. Por horas, días o meses.",
  },
  {
    icon: GraduationCap,
    title: "Formación",
    description:
      "Aulas equipadas para cursos, talleres y bootcamps. Hasta cuatro espacios formativos en paralelo.",
  },
  {
    icon: Mic,
    title: "Podcast & radio",
    description:
      "Estudio profesional para grabar tu programa o serie. Tratamiento acústico y micros listos para publicar.",
  },
  {
    icon: Calendar,
    title: "Eventos",
    description:
      "Salas configurables para presentaciones, asambleas y encuentros de comunidad de hasta 60 personas.",
  },
];

export const amenities = [
  { icon: Wifi, label: "Fibra simétrica" },
  { icon: Coffee, label: "Café ilimitado" },
  { icon: Printer, label: "Impresora" },
  { icon: Accessibility, label: "Accesible" },
];
