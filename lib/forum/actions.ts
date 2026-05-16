"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth/roles";
import type { TopicCategory } from "@prisma/client";

/**
 * Server actions del foro.
 *
 * Reglas:
 * - VISITOR puede LEER hilos públicos pero no postear.
 * - CLIENT/MEMBER/COLLABORATOR/ADMIN pueden crear topics + posts.
 * - Solo ADMIN puede pin/lock/delete y moderar.
 * - Reacciones a topic o post (LIKE/CELEBRATE/IDEA/THANK).
 *
 * Anti-spam:
 * - Rate limit por usuario: máx 5 topics/24h, 30 posts/24h.
 * - HTML sanitizado al guardar (el body solo es texto plano + saltos
 *   de línea; el render aplica markdown limitado en frontend).
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

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

// ============================================================
// Crear topic
// ============================================================

const newTopicSchema = z.object({
  title: z.string().min(5).max(160),
  body: z.string().min(10).max(20000),
  category: z.enum(["GENERAL", "ANUNCIOS", "PROYECTOS", "EVENTOS", "COWORKING", "AYUDA"]),
});

export async function createTopic(formData: FormData) {
  return withFeedback("/comunidad/nuevo", async () => {
    const user = await requireAuth("/comunidad/nuevo");

    const data = newTopicSchema.parse({
      title: formData.get("title"),
      body: formData.get("body"),
      category: formData.get("category"),
    });

    // Rate limit
    const recentTopics = await prisma.topic.count({
      where: {
        authorId: user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
      },
    });
    if (recentTopics >= 5 && user.role !== "ADMIN") {
      throw new Error("Has creado muchos hilos en las últimas 24h. Espera un poco.");
    }

    // Slug único
    const baseSlug = slugify(data.title);
    let slug = baseSlug;
    let n = 2;
    while (await prisma.topic.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n++}`;
      if (n > 50) throw new Error("No pude generar slug único.");
    }

    const topic = await prisma.topic.create({
      data: {
        slug,
        title: data.title,
        body: data.body,
        category: data.category as TopicCategory,
        authorId: user.id,
      },
    });

    // Notif Telegram al admin (alerta de actividad nueva)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `💬 *Nuevo hilo en comunidad*\n\n_${data.category}_\n${data.title}\nPor ${user.name || user.email}\n\n[Ver →](https://hubstartidea.es/comunidad/${slug})`,
          parse_mode: "Markdown",
        }),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => {});
    }

    revalidatePath("/comunidad");
    return { redirectTo: `/comunidad/${slug}` };
  });
}

// ============================================================
// Responder a topic
// ============================================================

const newPostSchema = z.object({
  topicSlug: z.string().min(1),
  body: z.string().min(2).max(20000),
});

export async function createPost(formData: FormData) {
  const topicSlug = String(formData.get("topicSlug") || "");
  return withFeedback(`/comunidad/${topicSlug}`, async () => {
    const user = await requireAuth(`/comunidad/${topicSlug}`);
    const data = newPostSchema.parse({
      topicSlug,
      body: formData.get("body"),
    });

    const topic = await prisma.topic.findUnique({
      where: { slug: data.topicSlug },
      include: { author: { select: { id: true, email: true, name: true } } },
    });
    if (!topic) throw new Error("Hilo no encontrado.");
    if (topic.locked && user.role !== "ADMIN") {
      throw new Error("Este hilo está cerrado.");
    }

    // Rate limit
    const recentPosts = await prisma.post.count({
      where: {
        authorId: user.id,
        createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
      },
    });
    if (recentPosts >= 30 && user.role !== "ADMIN") {
      throw new Error("Has posteado mucho en las últimas 24h. Espera un poco.");
    }

    await prisma.$transaction([
      prisma.post.create({
        data: {
          topicId: topic.id,
          authorId: user.id,
          body: data.body,
        },
      }),
      prisma.topic.update({
        where: { id: topic.id },
        data: { lastActivityAt: new Date() },
      }),
    ]);

    // Notificar al autor del hilo (si no es el mismo que responde)
    if (topic.author.id !== user.id && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails
        .send({
          from: process.env.RESEND_FROM || "HUB Startidea <hola@hubstartidea.es>",
          to: topic.author.email,
          subject: `Nueva respuesta en "${topic.title}"`,
          html: `<!doctype html><html lang="es"><body style="font-family:system-ui;padding:24px;color:#2a2a2a;background:#f4efe6;">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:24px;border-radius:14px;">
  <div style="font-size:22px;font-weight:700;"><span>startidea</span><span style="color:#e63e73;">.</span></div>
  <h1 style="font-size:18px;margin-top:16px;">Nueva respuesta en tu hilo</h1>
  <p style="font-size:14px;color:#666;">${user.name || "Alguien"} respondió a "<strong>${topic.title}</strong>":</p>
  <div style="margin:16px 0;padding:12px;background:#fafafa;border-radius:8px;font-size:14px;white-space:pre-wrap;">${data.body.slice(0, 400)}${data.body.length > 400 ? "…" : ""}</div>
  <a href="https://hubstartidea.es/comunidad/${topic.slug}" style="display:inline-block;padding:10px 18px;background:#2a2a2a;color:#f4efe6;text-decoration:none;border-radius:999px;font-size:14px;">Ver hilo</a>
</div></body></html>`,
          text: `${user.name || "Alguien"} respondió a "${topic.title}":\n\n${data.body.slice(0, 400)}\n\nVer: https://hubstartidea.es/comunidad/${topic.slug}`,
        })
        .catch(() => {});
    }

    revalidatePath(`/comunidad/${topic.slug}`);
    revalidatePath("/comunidad");
  });
}

// ============================================================
// Moderación admin
// ============================================================

export async function toggleTopicPinned(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  return withFeedback(`/comunidad/${slug}`, async () => {
    await requireAdmin();
    const topic = await prisma.topic.findUnique({ where: { slug } });
    if (!topic) throw new Error("No encontrado");
    await prisma.topic.update({ where: { id: topic.id }, data: { pinned: !topic.pinned } });
    revalidatePath("/comunidad");
    revalidatePath(`/comunidad/${slug}`);
  });
}

export async function toggleTopicLocked(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  return withFeedback(`/comunidad/${slug}`, async () => {
    await requireAdmin();
    const topic = await prisma.topic.findUnique({ where: { slug } });
    if (!topic) throw new Error("No encontrado");
    await prisma.topic.update({ where: { id: topic.id }, data: { locked: !topic.locked } });
    revalidatePath(`/comunidad/${slug}`);
  });
}

export async function deleteTopic(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  return withFeedback("/comunidad", async () => {
    const admin = await requireAdmin();
    const topic = await prisma.topic.findUnique({ where: { slug } });
    if (!topic) throw new Error("No encontrado");
    await prisma.topic.delete({ where: { id: topic.id } });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "topic.deleted",
        target: topic.id,
        metadata: { title: topic.title, slug: topic.slug } as never,
      },
    });
    revalidatePath("/comunidad");
  });
}

// ============================================================
// Reacciones
// ============================================================

const reactSchema = z.object({
  topicId: z.string().optional().nullable(),
  postId: z.string().optional().nullable(),
  type: z.enum(["LIKE", "CELEBRATE", "IDEA", "THANK"]),
  topicSlug: z.string().min(1),
});

export async function toggleReaction(formData: FormData) {
  const topicSlug = String(formData.get("topicSlug") || "");
  return withFeedback(`/comunidad/${topicSlug}`, async () => {
    const user = await requireAuth(`/comunidad/${topicSlug}`);
    const data = reactSchema.parse({
      topicId: formData.get("topicId") || null,
      postId: formData.get("postId") || null,
      type: formData.get("type"),
      topicSlug,
    });
    if (!data.topicId && !data.postId) throw new Error("Faltan topicId o postId");

    const existing = await prisma.reaction.findFirst({
      where: {
        userId: user.id,
        topicId: data.topicId || null,
        postId: data.postId || null,
        type: data.type,
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: {
          userId: user.id,
          topicId: data.topicId || null,
          postId: data.postId || null,
          type: data.type,
        },
      });
    }

    revalidatePath(`/comunidad/${topicSlug}`);
  });
}
