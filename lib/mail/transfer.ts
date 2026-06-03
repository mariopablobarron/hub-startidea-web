import { sendEmail, isResendConfigured } from "./resend";
import { bankTransfer, bankTransferReady } from "@/lib/content";

/**
 * Email con instrucciones de pago por transferencia bancaria.
 *
 * Se envía al crear una reserva cuyo método de pago es BANK_TRANSFER.
 * La reserva queda PENDING hasta que el admin confirme el ingreso desde
 * /admin/reservas ("Marcar pago recibido").
 *
 * Si aún no hay datos bancarios configurados (content.bankTransfer.iban
 * vacío), el email avisa de que se enviarán los datos en breve — la
 * reserva sigue siendo válida y el admin la cuadra igualmente.
 *
 * Si Resend no está configurado, no falla: la reserva ya está creada.
 */
export async function sendTransferInstructionsEmail(opts: {
  to: string;
  name: string;
  roomName: string;
  startsAt: Date;
  durationHours: number;
  totalCents: number;
  /** Concepto / referencia a indicar en la transferencia. */
  reference: string;
  /** Para guests sin cuenta: enlace de acceso a /me/reservas. */
  manageUrl?: string;
}): Promise<void> {
  if (!isResendConfigured()) return;

  const fmtDate = opts.startsAt.toLocaleString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const amount = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(opts.totalCents / 100);

  const ready = bankTransferReady();
  const bt = bankTransfer;

  const bankBlockHtml = ready
    ? `<div style="margin:20px 0;padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;font-size:14px;">
        <div style="font-weight:600;margin-bottom:8px;">Datos para la transferencia</div>
        ${bt?.holder ? `<div><strong>Titular:</strong> ${bt.holder}</div>` : ""}
        <div><strong>IBAN:</strong> <span style="font-family:monospace;letter-spacing:0.5px;">${bt?.iban}</span></div>
        ${bt?.bankName ? `<div><strong>Banco:</strong> ${bt.bankName}</div>` : ""}
        <div><strong>Importe:</strong> ${amount}</div>
        <div><strong>Concepto:</strong> ${opts.reference}</div>
        ${bt?.instructions ? `<div style="margin-top:8px;color:#9a3412;">${bt.instructions}</div>` : ""}
      </div>`
    : `<div style="margin:20px 0;padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;font-size:14px;color:#9a3412;">
        Te enviaremos los datos bancarios para completar el pago en breve. Indica el concepto <strong>${opts.reference}</strong> cuando hagas la transferencia.
      </div>`;

  const bankBlockText = ready
    ? `Datos para la transferencia\n${bt?.holder ? `Titular: ${bt.holder}\n` : ""}IBAN: ${bt?.iban}\n${bt?.bankName ? `Banco: ${bt.bankName}\n` : ""}Importe: ${amount}\nConcepto: ${opts.reference}\n${bt?.instructions ? `${bt.instructions}\n` : ""}`
    : `Te enviaremos los datos bancarios en breve. Concepto: ${opts.reference}.`;

  const manageHtml = opts.manageUrl
    ? `<p style="font-size:14px;line-height:1.6;color:#444;margin:16px 0 12px;">Puedes seguir el estado de tu reserva aquí (sin contraseña):</p>
       <a href="${opts.manageUrl}" style="display:inline-block;padding:12px 22px;background:#2a2a2a;color:#f4efe6;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">Ver mi reserva</a>`
    : `<a href="https://hubstartidea.es/me/reservas" style="display:inline-block;padding:12px 22px;background:#2a2a2a;color:#f4efe6;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">Ver mis reservas</a>`;

  await sendEmail({
    to: opts.to,
    subject: `Reserva pendiente de pago — ${opts.roomName}`,
    html: `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4efe6;font-family:-apple-system,system-ui,sans-serif;color:#2a2a2a;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #ddd5c4;">
    <tr><td style="padding:32px 28px;">
      <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">
        <span style="color:#2a2a2a;">startidea</span><span style="color:#e63e73;">.</span>
      </div>
      <h1 style="font-size:24px;margin:20px 0 12px;font-weight:600;line-height:1.2;">Hola ${opts.name} 👋</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 12px;">Hemos recibido tu reserva. Queda <strong>pendiente de pago por transferencia</strong>; en cuanto confirmemos el ingreso te llegará la confirmación.</p>
      <div style="margin:20px 0;padding:16px;background:#fafafa;border-radius:10px;font-size:14px;">
        <div><strong>Sala:</strong> ${opts.roomName}</div>
        <div><strong>Fecha:</strong> ${fmtDate}</div>
        <div><strong>Duración:</strong> ${opts.durationHours.toFixed(1)}h</div>
        <div><strong>Total:</strong> ${amount}</div>
      </div>
      ${bankBlockHtml}
      ${manageHtml}
    </td></tr>
    <tr><td style="padding:18px 28px;background:#fafafa;color:#999;font-size:12px;border-radius:0 0 14px 14px;">
      HUB Startidea · C/ Conde Cifuentes 33 · Granada · hubstartidea.es
    </td></tr>
  </table>
</body></html>`,
    text: `Hola ${opts.name},

Hemos recibido tu reserva. Queda PENDIENTE de pago por transferencia; al confirmar el ingreso te llegará la confirmación.

Sala: ${opts.roomName}
Fecha: ${fmtDate}
Duración: ${opts.durationHours.toFixed(1)}h
Total: ${amount}

${bankBlockText}

${opts.manageUrl ? `Ver tu reserva: ${opts.manageUrl}` : "Ver tus reservas: https://hubstartidea.es/me/reservas"}

— HUB Startidea`,
  }).catch(() => {});
}
