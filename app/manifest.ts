import type { MetadataRoute } from "next";
import { content } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: content.site.name,
    short_name: "HUB",
    description: content.site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#0a0a0b",
    icons: [
      {
        src: "/images/og/og-default.jpg",
        sizes: "1200x630",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
    lang: "es",
  };
}
