"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import sharp from "sharp";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, getCurrentUser } from "@/lib/auth/roles";
import { commitFile } from "@/lib/admin/persist";
import { content } from "@/lib/content";

/**
 * Server actions de eventos.
 *
 * Eventos:
 * - CRUD admin con upload de cover (sharp + commit a /public).
 * - Registro público (sin login) o como user logged → suma reg al evento.
 * - Plazas limitadas: cuando capacity llega, nuevas → WAITLIST.
 * - Notificación email confirmando registro + .ics para añadir a calendar.
 */

async function withFeedback(
  redirectPath: string,
  fn: () => Promise<{ redirectTo?: string } | void>,
): Promise<never> {
  try {
    const r = await fn();
    if (r?.redirectTo) redirect(r.redirectTo);
  } catch (e: unknown) {
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    redirect(`${redirectPath}?error=${encodeURIComponent(msg.slice(0, 200))}`);
  }
  redirect(`${redirectPath}?saved=1`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ============================================================
// CRUD Admin
// ============================================================

const eventSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(5000),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  roomSlug: z.string().optional().nullable(),
  externalLocation: z.string().max(200).optional().nullable(),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
  published: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
  isPublic: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
});

export async function createEvent(formData: FormData) {
  return withFeedback("/admin/eventos", async () => {
    const admin = await requireAdmin();

    const data = eventSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      roomSlug: formData.get("roomSlug") || null,
      externalLocation: formData.get("externalLocation") || null,
      capacity: formData.get("capacity") || null,
      published: formData.get("published"),
      isPublic: formData.get("isPublic"),
    });

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    if (endsAt <= startsAt) throw new Error("endsAt debe ser posterior a startsAt");

    // Slug único — añade -2, -3, etc. si colisiona
    const baseSlug = slugify(data.title);
    let slug = baseSlug;
    let n = 2;
    while (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n++}`;
      if (n > 50) throw new Error("No pude generar un slug único.");
    }

    // Upload cover opcional
    const coverPath = await maybeProcessCover(formData, slug);

    const event = await prisma.event.create({
      data: {
        slug,
        title: data.title,
        description: data.description,
        startsAt,
        endsAt,
        roomSlug: data.roomSlug || null,
        externalLocation: data.externalLocation || null,
        capacity: data.capacity || null,
        published: data.published || false,
        isPublic: data.isPublic !== false, // default true
        cover: coverPath,
        organizerId: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "event.created",
        target: event.id,
        metadata: { title: data.title, slug } as never,
      },
    });

    revalidatePath("/eventos");
    revalidatePath("/admin/eventos");
    return { redirectTo: `/admin/eventos/${event.id}?saved=1` };
  });
}

export async function updateEvent(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Falta id");

  return withFeedback(`/admin/eventos/${id}`, async () => {
    const admin = await requireAdmin();

    const data = eventSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      roomSlug: formData.get("roomSlug") || null,
      externalLocation: formData.get("externalLocation") || null,
      capacity: formData.get("capacity") || null,
      published: formData.get("published"),
      isPublic: formData.get("isPublic"),
    });

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) throw new Error("Evento no encontrado.");

    // Si se sube cover nuevo, reemplaza
    const coverPath = await maybeProcessCover(formData, existing.slug);

    await prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        roomSlug: data.roomSlug || null,
        externalLocation: data.externalLocation || null,
        capacity: data.capacity || null,
        published: data.published || false,
        isPublic: data.isPublic !== false,
        ...(coverPath ? { cover: coverPath } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "event.updated",
        target: id,
        metadata: { title: data.title } as never,
      },
    });

    revalidatePath("/eventos");
    revalidatePath(`/eventos/${existing.slug}`);
    revalidatePath("/admin/eventos");
  });
}

export async function deleteEvent(formData: FormData) {
  const id = String(formData.get("id") || "");

  return withFeedback("/admin/eventos", async () => {
    const admin = await requireAdmin();
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) throw new Error("No encontrado");

    await prisma.event.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "event.deleted",
        target: id,
        metadata: { title: existing.title } as never,
      },
    });

    revalidatePath("/eventos");
    revalidatePath("/admin/eventos");
  });
}

async function maybeProcessCover(formData: FormData, slug: string): Promise<string | null> {
  const file = formData.get("cover") as File | null;
  if (!file || file.size === 0) return null;
  if (file.size > 15 * 1024 * 1024) throw new Error("Imagen demasiado grande (máx 15 MB)");

  const buf = Buffer.from(await file.arrayBuffer());
  const optimized = await sharp(buf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true, fit: "inside" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const path = `public/images/events/${slug}.jpg`;
  await commitFile({ path, content: optimized, message: `feat(admin): cover de evento ${slug}` });
  return `/images/events/${slug}.jpg`;
}

// ============================================================
// Registro público
// ============================================================

const registerSchema = z.object({
  eventId: z.string().min(1),
  email: z.string().email().toLowerCase(),
  name: z.string().min(2).max(120),
  phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  consent: z.union([z.literal("on"), z.literal("true"), z.boolean()]).refine((v) => v === "on" || v === "true" || v === true, {
    message: "Acepta la política de privacidad",
  }),
});

export async function registerForEvent(formData: FormData) {
  const eventId = String(formData.get("eventId") || "");
  const slug = String(formData.get("slug") || "");

  return withFeedback(`/eventos/${slug}`, async () => {
    const data = registerSchema.parse({
      eventId,
      email: formData.get("email"),
      name: formData.get("name"),
      phone: formData.get("phone") || null,
      notes: formData.get("notes") || null,
      consent: formData.get("consent"),
    });

    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } },
    });
    if (!event || !event.published) throw new Error("Evento no encontrado.");
    if (event.startsAt < new Date()) throw new Error("Este evento ya ha pasado.");

    // Si el form viene con login, asociamos User
    const me = await getCurrentUser();

    const registeredCount = event._count.registrations;
    const status = event.capacity && registeredCount >= event.capacity ? "WAITLIST" : "REGISTERED";

    try {
      await prisma.eventRegistration.create({
        data: {
          eventId: event.id,
          userId: me?.id || null,
          email: data.email,
          name: data.name,
          phone: data.phone || null,
          notes: data.notes || null,
          status,
        },
      });
    } catch (e) {
      // Unique constraint (email, eventId) → ya estaba registrado
      if ((e as { code?: string })?.code === "P2002") {
        throw new Error("Ya estás inscrito en este evento con ese email.");
      }
      throw e;
    }

    // Email de confirmación
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const room = event.roomSlug ? content.rooms.find((r) => r.slug === event.roomSlug) : null;
      const where = room ? `${room.name} — ${content.site.address.street}` : event.externalLocation || content.site.address.street;
      const fmt = event.startsAt.toLocaleString("es-ES", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });
      await resend.emails.send({
        from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
        to: data.email,
        subject: `Inscripción ${status === "WAITLIST" ? "en lista de espera" : "confirmada"} — ${event.title}`,
        html: `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4efe6;font-family:-apple-system,system-ui,sans-serif;color:#2a2a2a;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #ddd5c4;">
    <tr><td style="padding:32px 28px;">
      <div style="font-size:26px;font-weight:700;letter-spacing:-0.02em;"><span>startidea</span><span style="color:#e63e73;">.</span></div>
      <h1 style="font-size:22px;margin:20px 0 12px;line-height:1.2;">${status === "WAITLIST" ? "Te hemos puesto en lista de espera 📋" : "¡Inscripción confirmada! 🎉"}</h1>
      <p style="font-size:15px;line-height:1.6;color:#444;">Hola ${data.name.split(" ")[0]}, gracias por inscribirte a:</p>
      <div style="margin:20px 0;padding:16px;background:#fafafa;border-radius:10px;font-size:14px;line-height:1.6;">
        <div style="font-weight:600;font-size:16px;">${event.title}</div>
        <div style="margin-top:8px;color:#666;">📅 ${fmt}</div>
        <div style="color:#666;">📍 ${where}</div>
      </div>
      <a href="https://hubstartidea.es/eventos/${event.slug}/ics" style="display:inline-block;padding:12px 22px;background:#2a2a2a;color:#f4efe6;text-decoration:none;border-radius:999px;font-size:14px;">Añadir al calendario (.ics)</a>
      <p style="margin-top:20px;font-size:13px;color:#999;">Si no puedes venir, escríbenos a hola@hubstartidea.es y te damos de baja.</p>
    </td></tr>
  </table>
</body></html>`,
        text: `Inscripción ${status === "WAITLIST" ? "en lista de espera" : "confirmada"}\n\n${event.title}\n${fmt}\n${where}\n\nAñadir al calendario: https://hubstartidea.es/eventos/${event.slug}/ics`,
      });
    }

    // Telegram al admin
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `🎫 *Nueva inscripción${status === "WAITLIST" ? " (lista de espera)" : ""}*\n\n${event.title}\n${data.name} — ${data.email}\n\n${registeredCount + 1}${event.capacity ? `/${event.capacity}` : ""} inscritos`,
          parse_mode: "Markdown",
        }),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => {});
    }

    revalidatePath(`/eventos/${slug}`);
  });
}
