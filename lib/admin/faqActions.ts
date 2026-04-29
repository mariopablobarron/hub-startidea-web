"use server";

import { auth } from "@/auth";
import { faq, type Faq } from "@/lib/chat/faqShape";
import { commitFile, triggerRedeploy } from "./persist";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
}

type FaqJson = Faq;

async function saveFaq(next: FaqJson, message: string) {
  const json = JSON.stringify(next, null, 2) + "\n";
  await commitFile({ path: "data/faq.json", content: json, message });
  await triggerRedeploy();
}

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(v: FormDataEntryValue | null): string {
  return String(v || "").trim();
}

export async function updateFaq(formData: FormData) {
  await requireAdmin();

  const next: FaqJson = {
    ...faq,
    _meta: { ...faq._meta, lastUpdated: new Date().toISOString().slice(0, 10) },
    tariffs: {
      ...faq.tariffs,
      _note: faq.tariffs._note,
      coworkingOpen: {
        perDay: num(formData.get("cw-perDay")),
        perWeek: num(formData.get("cw-perWeek")),
        perMonth: num(formData.get("cw-perMonth")),
        packs: str(formData.get("cw-packs"))
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: str(formData.get("cw-notes")),
      },
      officePrivate: {
        perMonth: num(formData.get("op-perMonth")),
        minStay: str(formData.get("op-minStay")),
        notes: str(formData.get("op-notes")),
      },
      rooms: Object.fromEntries(
        Object.keys(faq.tariffs.rooms).map((slug) => [
          slug,
          {
            perHour: num(formData.get(`r-${slug}-perHour`)),
            halfDay: num(formData.get(`r-${slug}-halfDay`)),
            fullDay: num(formData.get(`r-${slug}-fullDay`)),
            event: num(formData.get(`r-${slug}-event`)),
            session2h: num(formData.get(`r-${slug}-session2h`)),
            editedEpisode: num(formData.get(`r-${slug}-editedEpisode`)),
            minBooking: str(formData.get(`r-${slug}-minBooking`)),
            notes: str(formData.get(`r-${slug}-notes`)),
          },
        ]),
      ),
      discounts: str(formData.get("discounts"))
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      trial: str(formData.get("trial")),
    },
    schedule: {
      openHours: str(formData.get("openHours")),
      weekend: str(formData.get("weekend")),
      access24h: str(formData.get("access24h")),
      holidays: str(formData.get("holidays")),
    },
    location: {
      address: str(formData.get("address")),
      neighborhood: str(formData.get("neighborhood")),
      publicTransport: str(formData.get("publicTransport")),
      parking: str(formData.get("parking")),
      accessibility: str(formData.get("accessibility")),
    },
    policies: {
      pets: str(formData.get("pets")),
      smoking: str(formData.get("smoking")),
      kitchen: str(formData.get("kitchen")),
      wifi: str(formData.get("wifi")),
    },
    extras: str(formData.get("extras"))
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    frequentQuestions: [0, 1, 2, 3, 4]
      .map((i) => ({
        q: str(formData.get(`fq-${i}-q`)),
        a: str(formData.get(`fq-${i}-a`)),
      }))
      .filter((f) => f.q && f.a),
    handoff: {
      whatsappNumber: str(formData.get("whatsappNumber")),
      whatsappMessage: str(formData.get("whatsappMessage")),
      email: str(formData.get("email")),
      triggers: str(formData.get("triggers"))
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    },
  };

  await saveFaq(next, "feat(admin): actualizar FAQ del chatbot");
}
