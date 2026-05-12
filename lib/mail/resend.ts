import { Resend } from "resend";

// Cliente Resend perezoso: NO se instancia en build time porque en producción
// queremos errores claros si falta RESEND_API_KEY, no un fallo silencioso al
// hacer next build. En dev/test sin API key, los métodos sender() devuelven
// un error útil en runtime.

let _client: Resend | null = null;

function getClient(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  _client = new Resend(key);
  return _client;
}

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const from =
    process.env.RESEND_FROM ||
    "HUB Startidea <hola@hubstartidea.es>";

  const client = getClient();
  const { data, error } = await client.emails.send({
    from,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });

  if (error) {
    // El SDK devuelve { name, message } en lugar de Error. Lo serializamos
    // para que el caller pueda loguearlo con sentido.
    throw new Error(`Resend error: ${error.name || "unknown"} — ${error.message || ""}`);
  }
  if (!data?.id) {
    throw new Error("Resend devolvió sin id de envío");
  }
  return { id: data.id };
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
