import type { MetadataRoute } from "next";
import { content } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  const base = content.site.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Áreas privadas / no indexables
          "/admin",
          "/admin/*",
          "/api/*",
          "/me",
          "/me/*",
          "/feedback/*",
          // Bots de scraping de sitios de casino que pinguean nuestro
          // dominio buscando URLs de apuestas. El middleware ya devuelve
          // 410 en estos paths, pero los crawlers educados (Google,
          // Bing, archive.org) respetan robots.txt y dejan de intentar.
          "/casinos*",
          "/casino-*",
          "/juega-*",
          "/wild-*",
          "/*-megaways*",
          "/*-demo*",
          "/tragaperras*",
          "/crupier*",
          "/blackjack*",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
