import { ImageResponse } from "next/og";

// Favicon dinámico — Manual de Identidad Startidea: "s" + punto magenta.
// Tamaño 32x32 (estándar de pestañas). Se sirve en /icon.png automáticamente.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function Icon() {
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
          fontSize: 22,
          letterSpacing: "-0.04em",
        }}
      >
        <span style={{ color: "#2a2a2a" }}>s</span>
        <span style={{ color: "#e63e73", marginLeft: -1 }}>.</span>
      </div>
    ),
    { ...size },
  );
}
