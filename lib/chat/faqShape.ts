/**
 * Forma flexible del FAQ. TypeScript infiere `null` literal de los valores
 * iniciales en data/faq.json — este shape lo reabre para permitir que
 * cualquier sala tenga `null` o un número en cualquier campo de tarifa.
 */

export type RoomTariff = {
  perHour?: number | null;
  halfDay?: number | null;
  fullDay?: number | null;
  event?: number | null;
  session2h?: number | null;
  editedEpisode?: number | null;
  minBooking?: string;
  notes?: string;
};

export type Faq = {
  _meta: { description: string; lastUpdated: string; version: number };
  tariffs: {
    _note: string;
    coworkingOpen: {
      perDay: number | null;
      perWeek: number | null;
      perMonth: number | null;
      packs: string[];
      notes: string;
    };
    officePrivate: {
      perMonth: number | null;
      minStay: string;
      notes: string;
    };
    rooms: Record<string, RoomTariff>;
    discounts: string[];
    trial: string;
  };
  schedule: {
    openHours: string;
    weekend: string;
    access24h: string;
    holidays: string;
  };
  location: {
    address: string;
    neighborhood: string;
    publicTransport: string;
    parking: string;
    accessibility: string;
  };
  policies: {
    pets: string;
    smoking: string;
    kitchen: string;
    wifi: string;
  };
  extras: string[];
  frequentQuestions: Array<{ q: string; a: string }>;
  handoff: {
    whatsappNumber: string;
    whatsappMessage: string;
    email: string;
    triggers: string[];
  };
};

import faqJson from "@/data/faq.json";
export const faq: Faq = faqJson as Faq;
