import { ImageResponse } from "next/og";
import { content } from "@/lib/content";

export const alt = "Ecosistema Startidea — los proyectos detrás del HUB";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Acentos por proyecto. Mantenemos identidades individuales como el Manual
// permite (Granada Social tiene marca/color propios; lo mismo para los
// proyectos del ecosistema). "coral" mapea a magenta Startidea oficial.
const ACCENT_HEX: Record<string, string> = {
  coral: "#e63e73",
  warm: "#ffae84",
  earth: "#9c6b3f",
  ink: "#2a2a2a",
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
          background: "#f4efe6", // Crema Startidea
          color: "#2a2a2a",      // Grafito Startidea
        }}
      >
        {/* Wordmark startidea. — Manual de Identidad */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em" }}>
          <span style={{ color: "#2a2a2a" }}>startidea</span>
          <span style={{ color: "#e63e73" }}>.</span>
          <span style={{ marginLeft: 14, fontSize: 14, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6b6b6b" }}>
            Ecosistema
          </span>
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
            <span>Cuatro proyectos, un</span>
            <span style={{ color: "#e63e73", fontStyle: "italic" }}>universo</span>
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
                    background: ACCENT_HEX[p.accent] || "#e63e73",
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
