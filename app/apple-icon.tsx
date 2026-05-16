import { ImageResponse } from "next/og";

// Apple touch icon — Manual de Identidad: wordmark startidea. en crema.
// iOS lo usa cuando guardas a pantalla de inicio. 180x180 es el estándar.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4efe6", // crema
          fontFamily: "system-ui",
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        <span style={{ fontSize: 80, color: "#2a2a2a" }}>s</span>
        <span style={{ fontSize: 80, color: "#e63e73", marginLeft: -4 }}>.</span>
      </div>
    ),
    { ...size },
  );
}
