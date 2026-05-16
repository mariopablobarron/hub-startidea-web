import type { MetadataRoute } from "next";
import { content } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: content.site.name,
    short_name: "Startidea HUB",
    description: content.site.description,
    start_url: "/",
    display: "standalone",
    // Manual Startidea: Crema (fondo) + Grafito (theme)
    background_color: "#f4efe6",
    theme_color: "#2a2a2a",
    icons: [
      {
        src: "/images/og/og-default.jpg",
        sizes: "1200x630",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
    lang: "es-ES",
  };
}
