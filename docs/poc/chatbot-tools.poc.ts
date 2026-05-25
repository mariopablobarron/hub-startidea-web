/**
 * POC — Tools para el chatbot del HUB con Vercel AI SDK
 *
 * NO está en producción. Demuestra cómo extender el chatbot existente
 * con function calling de forma type-safe.
 *
 * Para activar:
 * 1. Renombrar a tools.ts
 * 2. En app/api/chat/route.ts añadir a streamText({...}):
 *      tools: hubTools,
 *      stopWhen: stepCountIs(5),  // máximo 5 turnos de tool calls
 *
 * El modelo decide cuándo llamar a las tools. No tienes que escribir
 * "if user asks X, call Y" — el LLM lo resuelve solo a partir de
 * `description` + el contexto de la conversación.
 */
import { tool } from "ai";
import { z } from "zod";
import { content, bookableRooms, isBookable } from "@/lib/content";
import { faq } from "@/lib/chat/faqShape";

/**
 * Devuelve info estructurada de una sala. El LLM la usa para responder
 * preguntas concretas ("¿cuánta gente cabe en Sócrates?") con datos
 * frescos, no del knowledge base estático del system prompt.
 */
export const getRoomInfo = tool({
  description:
    "Devuelve información detallada de una sala del HUB: capacidad, área, equipamiento, usos. Úsala cuando el usuario pregunte por una sala concreta.",
  inputSchema: z.object({
    slug: z
      .enum(content.rooms.map((r) => r.slug) as [string, ...string[]])
      .describe("Identificador de la sala. Slugs válidos: cc33, serendipia, socrates, estudio-podcast, office-privado, aula-1, aula-3, coworking-open"),
  }),
  execute: async ({ slug }) => {
    const room = content.rooms.find((r) => r.slug === slug);
    if (!room) return { error: `Sala "${slug}" no encontrada.` };
    return {
      name: room.name,
      subtitle: room.subtitle,
      area_m2: room.area,
      capacities: room.capacity,
      uses: room.uses,
      equipment: room.equipment,
      bookable_online: room.bookable !== false,
    };
  },
});

/**
 * Calcula presupuesto con descuento por rol Y desglose de IVA.
 *
 * Reglas de negocio (decididas 2026-05-18):
 * - Tarifa base: 20€/hora SIN IVA para todas las salas reservables.
 * - IVA: 21% (servicios España).
 * - Descuentos: coworker -30%, colaborador -20%, SOBRE LA BASE (antes del IVA).
 * - Fórmula: pvp = base_hora × horas × (1 - descuento) × (1 + iva)
 *
 * NO requiere que el LLM sepa hacer matemáticas — la lógica vive aquí.
 */
const VAT_RATE = (faq.tariffs as { vatRate?: number }).vatRate ?? 21;
const eur = (n: number) => Math.round(n * 100) / 100;

export const calculateQuote = tool({
  description:
    "Calcula presupuesto en euros para alquilar una sala por X horas. Devuelve el desglose base + IVA + total con el descuento aplicable al rol del cliente.",
  inputSchema: z.object({
    roomSlug: z.string().describe("Slug de la sala (ej. socrates, cc33)"),
    hours: z.number().min(1).max(12).describe("Número de horas"),
    role: z
      .enum(["visitor", "member", "collaborator"])
      .describe("Rol del cliente: visitor (sin descuento), member (-30%), collaborator (-20%)"),
  }),
  execute: async ({ roomSlug, hours, role }) => {
    const tariff = (faq.tariffs.rooms as Record<string, { perHour?: number; notes?: string }>)[roomSlug];
    if (!tariff?.perHour) {
      return {
        error: `Sala "${roomSlug}" no tiene tarifa por hora definida (probablemente no es reservable online). Derivar a humano.`,
      };
    }
    const room = content.rooms.find((r) => r.slug === roomSlug);
    const discountPct = role === "member" ? 30 : role === "collaborator" ? 20 : 0;

    const baseHoraSinDescuento = tariff.perHour;                           // 20
    const baseHoraConDescuento = baseHoraSinDescuento * (1 - discountPct / 100); // 14 / 16 / 20
    const baseTotal = baseHoraConDescuento * hours;
    const ivaTotal = baseTotal * (VAT_RATE / 100);
    const pvpTotal = baseTotal + ivaTotal;

    return {
      room: room?.name ?? roomSlug,
      hours,
      role,
      discount_pct: discountPct,
      base_per_hour_eur: eur(baseHoraConDescuento),
      base_total_eur: eur(baseTotal),
      vat_rate_pct: VAT_RATE,
      vat_total_eur: eur(ivaTotal),
      pvp_total_eur: eur(pvpTotal),
      requires_booking: room?.bookable !== false,
      notes: tariff.notes,
    };
  },
});

/**
 * Genera la URL de reserva online. El LLM la incluye en su respuesta
 * cuando el usuario quiere reservar (y la sala es bookable).
 *
 * Cuando migremos a Cal.com (Fase 3), esta tool cambia su retorno a
 * la URL del event-type en cal.hubstartidea.es. El resto del prompt
 * y la lógica del agente NO cambian.
 */
export const proposeBookingLink = tool({
  description:
    "Genera la URL para reservar online una sala del HUB. Úsala cuando el usuario decida reservar y la sala admita reservas online.",
  inputSchema: z.object({
    roomSlug: z.string().describe("Slug de la sala a reservar"),
  }),
  execute: async ({ roomSlug }) => {
    if (!isBookable(roomSlug)) {
      const room = content.rooms.find((r) => r.slug === roomSlug);
      return {
        bookable: false,
        message: `${room?.name ?? roomSlug} no se reserva online; hay que coordinarlo con Mario directamente.`,
        whatsapp: `https://wa.me/${faq.handoff.whatsappNumber.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hola, quiero reservar ${room?.name ?? roomSlug}`)}`,
      };
    }
    return {
      bookable: true,
      url: `https://hubstartidea.es/reservar?sala=${roomSlug}`,
      cta_label: "Reservar online",
    };
  },
});

/**
 * Captura lead. El LLM la llama solo cuando el usuario DA voluntariamente
 * su contacto y quiere que Mario le escriba.
 *
 * En producción: dispara email a hola@ + crea fila en BD.
 * En este POC: solo loguea.
 */
export const captureLead = tool({
  description:
    "Guarda los datos del visitante para que Mario le contacte. ÚSALA SOLO si el usuario ha dado voluntariamente su email/teléfono y ha pedido que le contacten.",
  inputSchema: z.object({
    name: z.string().describe("Nombre del visitante"),
    email: z.string().email().describe("Email del visitante"),
    summary: z.string().describe("Resumen 1-2 líneas de qué necesita"),
  }),
  execute: async ({ name, email, summary }) => {
    // POC: solo console.log. Producción: prisma.lead.create + email.
    console.log(`[lead] ${name} <${email}>: ${summary}`);
    return {
      success: true,
      message: `Apuntado. Mario te escribirá en menos de 24h laborables, ${name}.`,
    };
  },
});

/**
 * Las tools que se exponen al modelo. Importar y pasar a streamText().
 */
export const hubTools = {
  getRoomInfo,
  calculateQuote,
  proposeBookingLink,
  captureLead,
};
