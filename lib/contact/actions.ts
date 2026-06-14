"use server";

import { headers } from "next/headers";
import { contactSchema } from "./schema";
import { rateLimit, maybeSweep } from "./rate-limit";
import { adminEmail, userEmail } from "./emails";
import { sendEmail, isResendConfigured } from "@/lib/mail/resend";
import { sendContactToTelegram, isTelegramConfigured } from "./telegram";
import { ingestContactToCrm } from "@/lib/crm/ingest";

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

  // 4. Si Resend NO está configurado (preview / dev), intentamos al menos
  //    enviar a Telegram para no perder el lead. Si tampoco hay Telegram,
  //    devolvemos "modo demo" pero la UX no se rompe.
  const resendOk = isResendConfigured();
  const telegramOk = isTelegramConfigured();

  if (!resendOk && !telegramOk) {
    console.warn("[contact] ni Resend ni Telegram configurados — lead NO entregado:", {
      name: data.name,
      email: data.email,
    });
    return {
      status: "ok",
      message: "¡Recibido! (modo demo — ni Resend ni Telegram configurados)",
    };
  }

  // 5. Envío en paralelo a TODOS los canales activos. Si falla solo uno,
  //    seguimos OK (telegram suele entregar incluso si Resend tiene un bache).
  //    Resend devuelve error con throw → lo capturamos.
  //    Telegram devuelve { ok, error } sin throw → no rompe el Promise.all.
  const errors: string[] = [];

  const tasks: Array<Promise<unknown>> = [];

  if (resendOk) {
    const admin = adminEmail(data);
    const user = userEmail(data);
    const adminTo = process.env.ADMIN_EMAIL || "mario@startidea.es";
    tasks.push(
      sendEmail({
        to: adminTo,
        subject: admin.subject,
        html: admin.html,
        text: admin.text,
        replyTo: data.email,
      }).catch((e) => {
        errors.push(`email-admin: ${e instanceof Error ? e.message : String(e)}`);
        console.error("[contact] email admin falló:", e);
      }),
      sendEmail({
        to: data.email,
        subject: user.subject,
        html: user.html,
        text: user.text,
      }).catch((e) => {
        // El email de auto-respuesta es menos crítico — si falla, log y seguir.
        errors.push(`email-user: ${e instanceof Error ? e.message : String(e)}`);
        console.error("[contact] email auto-respuesta falló:", e);
      }),
    );
  }

  if (telegramOk) {
    tasks.push(
      sendContactToTelegram(data).then((r) => {
        if (!r.ok) {
          errors.push(`telegram: ${r.error}`);
          console.error("[contact] Telegram falló:", r.error);
        }
      }),
    );
  }

  // Lead del formulario de contacto → CRM central. No suma a `errors`
  // (el helper nunca lanza); es captación secundaria al aviso a Mario.
  tasks.push(
    ingestContactToCrm({
      email: data.email,
      name: data.name,
      source: "hub-coworking:contacto",
      tags: ["contacto-web"],
      kind: "newsletter",
    }).then(() => {}),
  );

  try {
    await Promise.all(tasks);

    // Si ningún canal entregó (todos fallaron) → error real al usuario.
    // Si al menos uno entregó (típicamente Telegram, que es síncrono y simple),
    // damos OK porque Mario va a ver el lead.
    const channels = (resendOk ? 2 : 0) + (telegramOk ? 1 : 0);
    if (errors.length >= channels) {
      return {
        status: "error",
        message:
          "No se pudo entregar el mensaje. Inténtalo de nuevo o escríbenos a hola@hubstartidea.es.",
      };
    }

    return {
      status: "ok",
      message: "¡Mensaje recibido! Te respondemos en menos de 24 horas.",
    };
  } catch (err) {
    console.error("[contact] error inesperado:", err);
    return {
      status: "error",
      message:
        "No se pudo enviar el mensaje. Inténtalo de nuevo o escríbenos a hola@hubstartidea.es.",
    };
  }
}
