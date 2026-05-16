import type { MetadataRoute } from "next";
import { content, rooms } from "@/lib/content";
import { prisma } from "@/lib/db/prisma";

// Sitemap dinámico — incluye eventos BD-driven
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = content.site.url.replace(/\/$/, "");
  const now = new Date();

  // Eventos publicados próximos — entran en sitemap para SEO
  // Manejo tolerante: si la BD no responde (build sin DATABASE_URL),
  // devolvemos sitemap sin eventos en lugar de fallar el build.
  let eventEntries: MetadataRoute.Sitemap = [];
  try {
    const events = await prisma.event.findMany({
      where: { published: true, isPublic: true, endsAt: { gte: now } },
      select: { slug: true, updatedAt: true, startsAt: true },
      orderBy: { startsAt: "asc" },
      take: 100,
    });
    eventEntries = events.map((e) => ({
      url: `${base}/eventos/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));
  } catch {
    // BD no disponible (probable build local sin migrate). Sigue sin eventos.
  }

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/ecosistema`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/metodo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${base}/salas`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...rooms.map((r) => ({
      url: `${base}/salas/${r.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${base}/eventos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    ...eventEntries,
    {
      url: `${base}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
