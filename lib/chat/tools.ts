import { tool } from "ai";
import { z } from "zod";
import { bookableRooms } from "@/lib/content";
import { bookingsInRange, isWithinOpeningHours } from "@/lib/bookings/availability";
import { quotePrice } from "@/lib/bookings/pricing";

/**
 * Tools del ChatWidget — function calling para que el LLM pueda:
 *  - listar salas reservables
 *  - consultar disponibilidad de un día
 *  - calcular precio para X horas (con IVA, tarifa visitor)
 *  - generar link a /reservar prellenado (sin crear reserva todavía)
 *
 * Filosofía: el chat informa y guía; la reserva real la hace el form de
 * /reservar que ya valida datos + Stripe Checkout. No metemos captura de
 * email/teléfono en chat — UX más limpia y menos riesgo.
 *
 * Las tools son ejecutables server-side (sin permission flow). El LLM
 * decide cuándo llamarlas según el system prompt.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hubstartidea.es";

const HOUR_RE = /^\d{2}:00$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const chatTools = {
  /**
   * Lista las salas reservables online con su descripción corta, capacidad
   * y slug. El LLM lo necesita para responder "¿qué salas hay?" y para
   * elegir el roomSlug correcto para otras tools.
   */
  listRooms: tool({
    description:
      "Lista las salas reservables del HUB Startidea con su slug, nombre, capacidad escolar/auditorio y frase corta. Úsala cuando el usuario pregunte qué salas hay disponibles o necesites identificar una sala antes de otra consulta.",
    inputSchema: z.object({}),
    execute: async () => {
      return {
        rooms: bookableRooms.map((r) => ({
          slug: r.slug,
          name: r.name,
          subtitle: r.subtitle,
          short: r.short,
          area_m2: r.area,
          capacity: {
            escolar: r.capacity.school,
            auditorio: r.capacity.theater,
            boardroom: r.capacity.boardroom ?? null,
            coctel: r.capacity.coctel ?? null,
          },
          highlight: r.highlight ?? null,
        })),
      };
    },
  }),

  /**
   * Disponibilidad de una sala en una fecha concreta. Devuelve los
   * 13 slots de 08:00 a 20:00 marcando libres/ocupados, para que el
   * LLM pueda decir "tienes libre 10:00, 12:00 y 16:00".
   */
  checkAvailability: tool({
    description:
      "Devuelve los slots horarios de una sala en una fecha concreta (formato YYYY-MM-DD). Marca cada hora del horario del HUB (08:00 a 20:00 inicio) como libre o ocupada. Úsala cuando el usuario pregunte si una sala está libre en una fecha o quiera elegir hora.",
    inputSchema: z.object({
      roomSlug: z.string().describe('Slug de la sala. Si no lo sabes, usa listRooms primero.'),
      date: z.string().regex(DATE_RE).describe('Fecha YYYY-MM-DD (e.g. 2026-12-15). Si el usuario dice "mañana", calcula la fecha tú.'),
    }),
    execute: async ({ roomSlug, date }) => {
      const room = bookableRooms.find((r) => r.slug === roomSlug);
      if (!room) {
        return {
          error: "room_not_found",
          message: `No encuentro la sala "${roomSlug}". Usa listRooms primero.`,
        };
      }
      const from = new Date(`${date}T00:00:00`);
      const to = new Date(`${date}T23:59:59`);
      if (isNaN(from.getTime())) {
        return { error: "bad_date", message: "Fecha inválida — usa YYYY-MM-DD." };
      }
      const dayBookings = await bookingsInRange({
        roomSlug,
        from,
        to,
      });

      // Slots 08:00 a 20:00 (puedes empezar 1h cada hora hasta las 20)
      const slots: Array<{ hour: string; status: "libre" | "ocupado" }> = [];
      const now = new Date();
      for (let h = 8; h <= 20; h++) {
        const slotStart = new Date(`${date}T${String(h).padStart(2, "0")}:00:00`);
        const slotEnd = new Date(`${date}T${String(h + 1).padStart(2, "0")}:00:00`);

        // Slot pasado → marcamos como pasado (no se puede reservar)
        const isPast = slotStart < now;
        // Solapa con alguna reserva PENDING/CONFIRMED
        const overlap = dayBookings.some((b) => {
          return slotStart < b.endsAt && slotEnd > b.startsAt;
        });

        if (isPast) continue; // no listamos horas pasadas
        slots.push({
          hour: `${String(h).padStart(2, "0")}:00`,
          status: overlap ? "ocupado" : "libre",
        });
      }

      return {
        room: { slug: room.slug, name: room.name },
        date,
        slots,
        free_count: slots.filter((s) => s.status === "libre").length,
      };
    },
  }),

  /**
   * Precio para X horas con tarifa VISITOR (sin descuento), IVA incluido.
   * Si el usuario es MEMBER/COLLABORATOR, se le dice que con cuenta tiene
   * descuento sin entrar en cifras (el chat no autentica).
   */
  quotePrice: tool({
    description:
      "Calcula el precio total (con IVA 21%) para reservar una sala durante X horas, tarifa visitor sin descuento. Devuelve baseCents, vatCents y totalCents. Úsala cuando el usuario pregunte por el precio de una sala por horas concretas.",
    inputSchema: z.object({
      roomSlug: z.string().describe('Slug de la sala.'),
      durationHours: z.number().int().min(1).max(8).describe('Duración en horas enteras (1 a 8).'),
    }),
    execute: async ({ roomSlug, durationHours }) => {
      const room = bookableRooms.find((r) => r.slug === roomSlug);
      if (!room) {
        return { error: "room_not_found", message: `No encuentro la sala "${roomSlug}".` };
      }
      const quote = await quotePrice({
        roomSlug,
        durationHours,
        role: "VISITOR",
      });
      if (!quote.quoted) {
        return {
          error: "no_tariff",
          message: `${room.name} no tiene tarifa por hora configurada — escríbenos a hola@hubstartidea.es para presupuesto.`,
        };
      }
      return {
        room: { slug: room.slug, name: room.name },
        durationHours,
        baseCents: quote.baseCents,
        vatCents: quote.vatCents,
        totalCents: quote.totalCents,
        totalEur: (quote.totalCents / 100).toFixed(2),
        baseHourEur: (quote.baseHourCents / 100).toFixed(2),
        vatRatePct: quote.vatRatePct,
        notes: "Tarifa visitor (sin descuento). Con cuenta MEMBER tienes -30%, COLLABORATOR -20%.",
      };
    },
  }),

  /**
   * Genera el link a /reservar con sala, fecha y hora prellenados.
   * NO crea reserva — devuelve URL. El user completa datos en el form.
   * Eso preserva la separación: chat informa, form ejecuta.
   */
  startBookingFlow: tool({
    description:
      "Genera el link a /reservar prellenado con sala, fecha y opcionalmente hora de inicio. NO crea la reserva — el usuario completa sus datos y paga en Stripe en la página. Úsala cuando el usuario quiera proceder a reservar tras consultar disponibilidad/precio.",
    inputSchema: z.object({
      roomSlug: z.string(),
      date: z.string().regex(DATE_RE).optional(),
      hour: z.number().int().min(8).max(20).optional().describe('Hora de inicio 8-20 (entero).'),
    }),
    execute: async ({ roomSlug, date, hour }) => {
      const room = bookableRooms.find((r) => r.slug === roomSlug);
      if (!room) {
        return { error: "room_not_found", message: `No encuentro la sala "${roomSlug}".` };
      }
      const params = new URLSearchParams();
      params.set("sala", room.slug);
      if (date) params.set("fecha", date);
      if (typeof hour === "number") params.set("hora", String(hour));

      // Validación: si dan fecha+hora, comprobar que es futuro y dentro de horario
      if (date && typeof hour === "number") {
        const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`);
        const end = new Date(`${date}T${String(hour + 1).padStart(2, "0")}:00:00`);
        if (start < new Date()) {
          return {
            error: "past_date",
            message: "La fecha/hora elegida ya ha pasado. Sugiere otra al usuario.",
          };
        }
        if (!isWithinOpeningHours(start, end)) {
          return {
            error: "out_of_hours",
            message: "Fuera del horario del HUB (08:00-21:00).",
          };
        }
      }

      const url = `${SITE_URL}/reservar?${params.toString()}`;
      return {
        room: { slug: room.slug, name: room.name },
        url,
        message:
          "Devuelve este link al usuario en formato markdown como [Reservar →](URL). Explica brevemente que en la página podrá ver tarifas, elegir slot y pagar con tarjeta o transferencia.",
      };
    },
  }),
};
