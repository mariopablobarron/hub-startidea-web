import type { ContactInput } from "./schema";
import { TOPIC_LABELS } from "./schema";
import { content } from "@/lib/content";

// Plantillas HTML inline para máxima compatibilidad con clientes de correo.
// Sin frameworks de email (react-email es overkill aquí); diseño minimalista
// que se ve bien en Gmail, Outlook, Apple Mail.

const COLOR_INK = "#0a0a0b";
const COLOR_CORAL = "#ed4f15";
const COLOR_PAPER = "#faf8f4";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Email que recibe Mario con los datos del contacto. */
export function adminEmail(input: ContactInput): { subject: string; html: string; text: string } {
  const room = input.roomSlug
    ? content.rooms.find((r) => r.slug === input.roomSlug)?.name || input.roomSlug
    : null;
  const topic = input.topic ? TOPIC_LABELS[input.topic] : null;

  const subject = `[hubstartidea] ${input.name}${topic ? ` — ${topic}` : ""}`;

  const rows: Array<[string, string]> = [
    ["Nombre", input.name],
    ["Email", input.email],
    ...(input.phone ? [["Teléfono", input.phone]] as Array<[string, string]> : []),
    ...(topic ? [["Tipo", topic]] as Array<[string, string]> : []),
    ...(room ? [["Sala de interés", room]] as Array<[string, string]> : []),
  ];

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:${COLOR_PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${COLOR_INK};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eaeaea;">
    <tr><td style="padding:24px 28px;background:${COLOR_CORAL};color:#fff;">
      <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.85;">Nuevo contacto</div>
      <div style="font-size:22px;font-weight:600;margin-top:4px;">${escape(input.name)}</div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${rows
          .map(
            ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#666;font-size:13px;width:140px;vertical-align:top;">${escape(label)}</td>
          <td style="padding:8px 0;font-size:15px;color:${COLOR_INK};">${escape(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eaeaea;">
        <div style="color:#666;font-size:13px;margin-bottom:8px;">Mensaje</div>
        <div style="font-size:15px;line-height:1.55;white-space:pre-wrap;color:${COLOR_INK};">${escape(input.message)}</div>
      </div>
      <div style="margin-top:28px;">
        <a href="mailto:${escape(input.email)}?subject=Re%3A%20Tu%20mensaje%20a%20HUB%20Startidea" style="display:inline-block;padding:10px 18px;background:${COLOR_INK};color:#fff;text-decoration:none;border-radius:999px;font-size:14px;">Responder a ${escape(input.email)}</a>
      </div>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#fafafa;color:#888;font-size:12px;">
      Recibido desde el formulario de hubstartidea.es. Si no era para ti, ignora este mensaje.
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Nuevo contacto desde hubstartidea.es\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nMensaje:\n${input.message}\n`;

  return { subject, html, text };
}

/** Auto-respuesta al usuario que rellenó el form. */
export function userEmail(input: ContactInput): { subject: string; html: string; text: string } {
  const subject = "Hemos recibido tu mensaje — HUB Startidea";

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:${COLOR_PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${COLOR_INK};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eaeaea;">
    <tr><td style="padding:32px 28px 24px;">
      <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR_CORAL};">HUB Startidea</div>
      <h1 style="font-size:26px;margin:8px 0 16px;color:${COLOR_INK};font-weight:600;line-height:1.2;">Hola ${escape(input.name.split(" ")[0])}, hemos recibido tu mensaje 👋</h1>
      <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 14px;">Gracias por escribirnos. Solemos responder en menos de 24 horas laborables.</p>
      <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 14px;">Si tu necesidad es urgente puedes llamarnos al <a href="tel:${escape(content.site.phone.replace(/\s/g, ""))}" style="color:${COLOR_CORAL};">${escape(content.site.phoneDisplay)}</a> o pasarte por la oficina (C/ Conde Cifuentes 33, Granada).</p>
      <div style="margin-top:24px;padding:16px 18px;background:${COLOR_PAPER};border-radius:10px;font-size:14px;color:#666;line-height:1.55;white-space:pre-wrap;">${escape(input.message)}</div>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#fafafa;color:#888;font-size:12px;">
      Este es un email automático de confirmación. Si no fuiste tú quien escribió, puedes ignorarlo.<br>
      HUB Startidea · C/ Conde Cifuentes 33 · Granada · <a href="${escape(content.site.url)}" style="color:#888;">hubstartidea.es</a>
    </td></tr>
  </table>
</body>
</html>`;

  const text =
    `Hola ${input.name.split(" ")[0]},\n\n` +
    `Gracias por escribirnos. Solemos responder en menos de 24 horas laborables.\n\n` +
    `Si tu necesidad es urgente: ${content.site.phoneDisplay}.\n\n` +
    `Tu mensaje:\n${input.message}\n\n— HUB Startidea\n${content.site.url}\n`;

  return { subject, html, text };
}
