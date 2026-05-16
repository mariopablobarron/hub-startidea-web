import { ImageResponse } from "next/og";
import { content } from "@/lib/content";

export const alt = "Ecosistema Startidea — los proyectos detrás del HUB";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT_HEX: Record<string, string> = {
  coral: "#ed4f15",
  warm: "#ffae84",
  earth: "#9c6b3f",
  ink: "#0a0a0b",
};

export default async function OG() {
  const projects = content.ecosystem.projects;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px",
          fontFamily: "system-ui, sans-serif",
          background: "linear-gradient(135deg, #faf8f4 0%, #fff3ed 40%, #ffd2bd 100%)",
          color: "#0a0a0b",
        }}
      >
        {/* Top — branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 600 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              background: "#0a0a0b",
              color: "#faf8f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            H
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div>{content.site.name}</div>
            <div style={{ fontSize: 14, opacity: 0.6, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Ecosistema
            </div>
          </div>
        </div>

        {/* Middle — title + grid de 4 proyectos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.02,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              maxWidth: 1050,
              display: "flex",
              flexWrap: "wrap",
              gap: "0 0.25em",
            }}
          >
            <span>Cuatro proyectos, una</span>
            <span style={{ color: "#ed4f15", fontStyle: "italic" }}>casa madre</span>
            <span>en Granada.</span>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {projects.slice(0, 4).map((p) => (
              <div
                key={p.name}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "20px 22px",
                  borderRadius: 18,
                  background: "rgba(255, 255, 255, 0.7)",
                  border: "1px solid rgba(10, 10, 11, 0.1)",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: ACCENT_HEX[p.accent] || "#ed4f15",
                  }}
                />
                <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.15 }}>{p.name}</div>
                <div style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.3 }}>
                  {(p.what || "").slice(0, 40)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — meta */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, opacity: 0.7 }}>
          <div>{content.site.parent.name}</div>
          <div>hubstartidea.es/ecosistema</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
