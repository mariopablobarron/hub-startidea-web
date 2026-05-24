import { sendEmail, isResendConfigured } from "./resend";
import { content } from "@/lib/content";

const site = content.site;

/**
 * Email de bienvenida tras crear cuenta en el HUB.
 *
 * Se dispara desde el server action /registro AL CREAR el user (no si
 * el email ya existía). El usuario recibe esto JUNTO al magic-link de
 * NextAuth — son dos emails separados:
 *
 *  1. Magic-link (NextAuth Resend provider) — para entrar
 *  2. Bienvenida (esta función) — para explicar qué hay dentro
 *
 * Si Resend no está configurado, NO falla: solo loguea y sigue. El
 * registro tiene que funcionar incluso sin emails (dev local sin key).
 */
export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  /** URL del HUB tras login — por defecto /me, pero si vienen de /reservar respeta. */
  callbackUrl?: string;
}): Promise<void> {
  if (!isResendConfigured()) {
    console.log(`[welcome] Resend no configurado, skip welcome a ${opts.to}`);
    return;
  }

  const cta = opts.callbackUrl && opts.callbackUrl !== "/me" ? opts.callbackUrl : "/reservar";
  const ctaLabel = cta === "/reservar" ? "Reservar mi primera sala" : "Ir a mi cuenta";
  const ctaUrl = `${site.url}${cta}`;

  try {
    await sendEmail({
      to: opts.to,
      subject: `Bienvenida al HUB Startidea, ${opts.name.split(" ")[0]}`,
      html: `<!doctype html>
<html><body style="margin:0;background:#f4efe6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2a2a2a;">
<table width="100%" style="background:#f4efe6;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <tr><td style="padding:32px 32px 0;">
        <div style="font-size:22px;letter-spacing:-0.5px;">
          <span style="color:#2a2a2a;font-weight:600;">startidea</span><span style="color:#E63E73;">.</span>
        </div>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;">
        <h1 style="margin:0;font-size:28px;letter-spacing:-0.5px;color:#2a2a2a;">
          Hola ${escape(opts.name.split(" ")[0])}, bienvenida al HUB.
        </h1>
      </td></tr>
      <tr><td style="padding:8px 32px 16px;color:#555;font-size:15px;line-height:1.5;">
        <p>Tu cuenta ya está creada. Estas son las cosas que puedes hacer ahora mismo:</p>
        <ul style="padding-left:20px;margin:12px 0;">
          <li><strong>Reservar salas por horas</strong> — 5 espacios, tarifa única 20€/h base + IVA (24,20€/h PVP).</li>
          <li><strong>Foro de la comunidad</strong> — anuncios, dudas, organización de eventos.</li>
          <li><strong>Eventos del HUB</strong> — agenda viva con inscripción y recordatorios.</li>
        </ul>
        <p>Si vienes como coworker o colaborador y aún no te hemos asignado el rol, escríbenos y lo activamos en minutos — el descuento se aplica automático tras el cambio.</p>
      </td></tr>
      <tr><td style="padding:8px 32px 28px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#2a2a2a;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:500;font-size:15px;">
          ${ctaLabel} →
        </a>
      </td></tr>
      <tr><td style="padding:0 32px 32px;color:#777;font-size:13px;line-height:1.5;">
        <p style="margin:0;">
          ¿Dudas? Responde a este email y te leemos. También en
          <a href="${site.url}" style="color:#E63E73;">${new URL(site.url).host}</a>.
        </p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#fafafa;color:#999;font-size:12px;border-radius:0 0 14px 14px;text-align:center;">
        HUB Startidea · C/ Conde Cifuentes 33 · Granada
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
      text: `Hola ${opts.name.split(" ")[0]}, bienvenida al HUB Startidea.

Tu cuenta ya está creada. Cosas que puedes hacer ya:

- Reservar salas por horas (20€/h base + IVA = 24,20€/h PVP, descuentos por rol)
- Participar en el foro de la comunidad
- Inscribirte en eventos

${ctaLabel}: ${ctaUrl}

Si vienes como coworker o colaborador y aún no tienes el rol asignado,
escríbenos a hola@hubstartidea.es y lo activamos.

— HUB Startidea
C/ Conde Cifuentes 33, Granada`,
    });
  } catch (e) {
    // No falla el registro si el welcome email no se envía
    console.error(`[welcome] error enviando a ${opts.to}:`, e);
  }
}

/** Escape HTML básico para inyectar nombre del user en el template. */
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
