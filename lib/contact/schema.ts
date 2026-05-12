import { z } from "zod";

// Lista cerrada de tipos de consulta. Permite enrutar internamente y dar
// auto-respuestas distintas según necesidad sin tener que parsear texto libre.
export const CONTACT_TOPICS = [
  "visita",
  "reserva-puntual",
  "abono",
  "formacion",
  "podcast",
  "otro",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const TOPIC_LABELS: Record<ContactTopic, string> = {
  visita: "Quiero hacer una visita",
  "reserva-puntual": "Reservar una sala puntual",
  abono: "Información sobre abonos / coworking",
  formacion: "Formación o eventos",
  podcast: "Grabar en el estudio de podcast",
  otro: "Otro",
};

// Schema robusto: trim, longitudes razonables, honeypot debe estar vacío.
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Indícanos tu nombre")
    .max(120, "Nombre demasiado largo"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email no parece válido")
    .max(180),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  topic: z.enum(CONTACT_TOPICS).optional().or(z.literal("").transform(() => undefined)),
  roomSlug: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  message: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más, mínimo 10 caracteres")
    .max(2000, "Mensaje demasiado largo (máx 2000 caracteres)"),
  // Honeypot: campo invisible que solo bots rellenan. Si tiene contenido,
  // simulamos éxito al usuario pero no enviamos email.
  website: z.string().optional(),
  // Acepta-privacidad: legalmente requerido para guardar/procesar el email.
  consent: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((v) => v === "on" || v === "true" || v === true, {
      message: "Debes aceptar la política de privacidad",
    }),
});

export type ContactInput = z.infer<typeof contactSchema>;
