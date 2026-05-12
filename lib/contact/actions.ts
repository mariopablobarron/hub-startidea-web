"use server";

import { headers } from "next/headers";
import { contactSchema } from "./schema";
import { rateLimit, maybeSweep } from "./rate-limit";
import { adminEmail, userEmail } from "./emails";
import { sendEmail, isResendConfigured } from "@/lib/mail/resend";

export type ContactState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

// Server action: validar + rate-limit + enviar 2 emails (admin + auto-respuesta).
// Devuelve estado para useActionState; no usa redirect porque el form vive en
// la home (#contacto) y queremos mantener el scroll en la sección al responder.
export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // 1. Validación zod
  const raw = Object.fromEntries(formData);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as string | undefined;
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return {
      status: "error",
      message: "Revisa los campos marcados.",
      fieldErrors,
    };
  }
  const data = parsed.data;

  // 2. Honeypot — si está relleno, fingir éxito y no enviar nada.
  if (data.website && data.website.length > 0) {
    return { status: "ok", message: "¡Recibido! Te responderemos pronto." };
  }

  // 3. Rate limit por IP
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(ip);
  maybeSweep();
  if (!rl.ok) {
    const mins = Math.ceil(rl.retryAfterSec / 60);
    return {
      status: "error",
      message: `Demasiados envíos. Inténtalo de nuevo en ${mins} min.`,
    };
  }

  // 4. Si Resend no está configurado (preview / desarrollo), no romper la UX:
  //    confirmar al usuario pero loguear para que el dev sepa que no salió.
  if (!isResendConfigured()) {
    console.warn("[contact] RESEND_API_KEY no configurada — mensaje NO enviado:", {
      name: data.name,
      email: data.email,
    });
    return {
      status: "ok",
      message: "¡Recibido! (modo demo — Resend no configurado)",
    };
  }

  // 5. Enviar emails
  try {
    const admin = adminEmail(data);
    const user = userEmail(data);
    const adminTo = process.env.ADMIN_EMAIL || "mario@startidea.es";

    await Promise.all([
      sendEmail({
        to: adminTo,
        subject: admin.subject,
        html: admin.html,
        text: admin.text,
        replyTo: data.email,
      }),
      sendEmail({
        to: data.email,
        subject: user.subject,
        html: user.html,
        text: user.text,
      }),
    ]);

    return {
      status: "ok",
      message: "¡Mensaje recibido! Te respondemos en menos de 24 horas.",
    };
  } catch (err) {
    console.error("[contact] error enviando emails:", err);
    return {
      status: "error",
      message:
        "No se pudo enviar el mensaje. Inténtalo de nuevo o escríbenos a hola@hubstartidea.es.",
    };
  }
}
