import type { MetadataRoute } from "next";
import { content } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  const base = content.site.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/*", "/api/*"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
