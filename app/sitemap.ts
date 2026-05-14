import type { MetadataRoute } from "next";
import { content, rooms } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = content.site.url.replace(/\/$/, "");
  const now = new Date();

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
      url: `${base}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
