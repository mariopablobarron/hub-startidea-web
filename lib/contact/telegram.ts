import type { ContactInput } from "./schema";
import { TOPIC_LABELS } from "./schema";
import { content } from "@/lib/content";

// Notificación a Telegram con el mismo bot que ya gestiona uptime, backups
// y SEO weekly. El chat_id por defecto es el privado de Mario, pero puede
// apuntarse a un grupo/canal de la agencia editando TELEGRAM_CHAT_ID en
// Coolify (no requiere cambio de código).

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function escapeMarkdown(s: string): string {
  // Markdown clásico de Telegram (no MarkdownV2). Solo escapamos los
  // caracteres que pueden romper el parser: _ * [ ` que aparecen en
  // textos libres del usuario.
  return s.replace(/([_*[\]`])/g, "\\$1");
}

export async function sendContactToTelegram(input: ContactInput): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados" };
  }

  const topic = input.topic ? TOPIC_LABELS[input.topic] : null;
  const room = input.roomSlug
    ? content.rooms.find((r) => r.slug === input.roomSlug)?.name || input.roomSlug
    : null;

  const lines: string[] = [
    "📬 *Nuevo contacto en hubstartidea.es*",
    "",
    `👤 *Nombre*: ${escapeMarkdown(input.name)}`,
    `✉️ Email: ${escapeMarkdown(input.email)}`,
  ];
  if (input.phone) lines.push(`📞 Teléfono: ${escapeMarkdown(input.phone)}`);
  if (topic) lines.push(`🏷️ Tipo: ${escapeMarkdown(topic)}`);
  if (room) lines.push(`🚪 Sala de interés: ${escapeMarkdown(room)}`);
  lines.push("");
  lines.push("💬 _Mensaje:_");
  // Mensajes muy largos rompen Telegram (límite 4096). Truncamos por seguridad.
  const msgClean = input.message.slice(0, 2000);
  lines.push(escapeMarkdown(msgClean));
  if (input.message.length > 2000) lines.push("_…(truncado)_");
  lines.push("");
  lines.push(`✍️ Responder: mailto:${input.email}`);

  const text = lines.join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
      // 10s de timeout — si Telegram tarda más, no bloqueamos al usuario
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = await res.json();
    if (!json.ok) {
      return { ok: false, error: json.description || "Telegram devolvió ok=false" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
