import "server-only";

/**
 * Conector hub coworking → CRM central de TodoMerchandising.
 *
 * Cada contacto que capta el coworking (reserva guest, registro…) se
 * envía al CRM unificado vía POST /api/crm/ingest (server-to-server,
 * auth X-CRM-Secret). El CRM respeta supresión y deduplica por email.
 *
 * Fire-and-forget: si el CRM no responde o no está configurado, NO
 * rompe la reserva. La captación de contacto es secundaria al booking.
 *
 * Config (env del hub coworking):
 *  - CRM_INGEST_URL    (default https://merchandising.hubstartidea.es/api/crm/ingest)
 *  - CRM_INGEST_SECRET (compartido con el merch; sin él, no-op silencioso)
 */

const CRM_URL =
  process.env.CRM_INGEST_URL || "https://merchandising.hubstartidea.es/api/crm/ingest";

type IngestContact = {
  email: string;
  name?: string | null;
  phone?: string | null;
  /** De dónde viene el contacto, p.ej. "hub-coworking:reserva". */
  source?: string;
  /** Etiquetas para segmentar en el CRM. */
  tags?: string[];
  /** "newsletter" (default) o "outbound". */
  kind?: "newsletter" | "outbound";
};

/**
 * Envía un contacto al CRM. No lanza nunca — registra y sigue. Devuelve
 * true si el CRM confirmó ingesta, false si se omitió o falló.
 */
export async function ingestContactToCrm(contact: IngestContact): Promise<boolean> {
  const secret = process.env.CRM_INGEST_SECRET;
  if (!secret) {
    // Sin secret: integración no configurada todavía. Silencioso a propósito.
    return false;
  }
  if (!contact.email) return false;

  try {
    const res = await fetch(CRM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CRM-Secret": secret,
      },
      body: JSON.stringify({
        email: contact.email,
        name: contact.name || undefined,
        phone: contact.phone || undefined,
        source: contact.source || "hub-coworking",
        tags: contact.tags,
        kind: contact.kind || "newsletter",
      }),
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) {
      console.warn(`[crm-ingest] ${res.status} para ${contact.email}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[crm-ingest] error:", e instanceof Error ? e.message : e);
    return false;
  }
}
