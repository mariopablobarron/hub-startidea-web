import { ImageResponse } from "next/og";
import { content } from "@/lib/content";

// Node runtime (no edge): consistente con [slug]/opengraph-image.tsx.
export const alt = content.site.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
          background:
            "linear-gradient(135deg, #faf8f4 0%, #fff3ed 35%, #ffae84 75%, #ff6b35 100%)",
          color: "#0a0a0b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, fontWeight: 600 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#0a0a0b",
              color: "#faf8f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            H
          </div>
          <div>{content.site.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 20, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.72 }}>
            Coworking · Formación · Podcast
          </div>
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.02,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              maxWidth: 950,
              display: "flex",
              flexWrap: "wrap",
              gap: "0 0.25em",
            }}
          >
            <span>El espacio donde se cocina la</span>
            <span style={{ color: "#ed4f15", fontStyle: "italic" }}>innovación social</span>
            <span>en Granada.</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 22, opacity: 0.74 }}>
          <div>C/ Conde Cifuentes 33 · Granada</div>
          <div>hubstartidea.es</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
