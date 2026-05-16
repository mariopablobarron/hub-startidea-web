import { ImageResponse } from "next/og";
import { content } from "@/lib/content";

export const alt = "Raíz y Acción — Método Startidea para llevar ideas a la acción";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  const m = content.methodRaizAccion;
  const steps = m.steps.slice(0, 4);

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
          background: "linear-gradient(135deg, #2a1f15 0%, #3a2a1c 35%, #4a3a2a 100%)",
          color: "#faf8f4",
        }}
      >
        {/* Top — branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 600 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              background: "#c98d5b",
              color: "#2a1f15",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div>{content.site.name}</div>
            <div
              style={{
                fontSize: 14,
                opacity: 0.65,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#c98d5b",
              }}
            >
              Método de la casa
            </div>
          </div>
        </div>

        {/* Middle — title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div
            style={{
              fontSize: 16,
              letterSpacing: "0.3em",
              fontWeight: 700,
              color: "#c98d5b",
            }}
          >
            {m.label.toUpperCase()}
          </div>
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
            <span>De la</span>
            <span style={{ color: "#c98d5b", fontStyle: "italic" }}>raíz</span>
            <span>a la</span>
            <span style={{ color: "#c98d5b", fontStyle: "italic" }}>acción</span>
            <span>tangible.</span>
          </div>

          {/* 4 pasos como columnas */}
          <div style={{ display: "flex", gap: 14 }}>
            {steps.map((s) => (
              <div
                key={s.step}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "18px 20px",
                  borderRadius: 16,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(201, 141, 91, 0.25)",
                }}
              >
                <div style={{ fontSize: 38, fontWeight: 700, color: "#c98d5b", lineHeight: 1 }}>
                  {s.step}
                </div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.3 }}>
                  {`${s.description.slice(0, 60)}${s.description.length > 60 ? "…" : ""}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — meta */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, opacity: 0.65 }}>
          <div>{content.site.parent.name}</div>
          <div>hubstartidea.es/metodo</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
