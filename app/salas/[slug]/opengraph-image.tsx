import { ImageResponse } from "next/og";
import { rooms, getRoom, content, formatArea } from "@/lib/content";

// Sin runtime: edge — Next.js 15 no permite combinar edge + generateStaticParams.
// Node runtime es perfectamente válido para OG; las imágenes se cachean en CDN.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: { slug: string } };

export async function generateImageMetadata({ params }: Props) {
  const room = getRoom(params.slug);
  return room ? [{ alt: `${room.name} — ${room.subtitle}`, contentType, size, id: room.slug }] : [];
}

export function generateStaticParams() {
  return rooms.map((r) => ({ slug: r.slug }));
}

export default async function OG({ params }: Props) {
  const room = getRoom(params.slug);
  if (!room) {
    return new ImageResponse(<div>Sala no encontrada</div>, { ...size });
  }

  const cap = Math.max(
    room.capacity.school,
    room.capacity.theater,
    room.capacity.coctel ?? 0,
    room.capacity.boardroom ?? 0,
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#2a2a2a", // Grafito Startidea (era negro casi puro)
          color: "#f4efe6",      // Crema Startidea
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Lado izquierdo: foto */}
        <div style={{ width: "55%", height: "100%", display: "flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${content.site.url}${room.image}`}
            alt=""
            width={660}
            height={630}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Lado derecho: texto */}
        <div
          style={{
            width: "45%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 56px",
          }}
        >
          {/* Wordmark startidea. — Manual de Identidad */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#f4efe6" }}>startidea</span>
            <span style={{ color: "#e63e73" }}>.</span>
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.55 }}>
              HUB · Granada
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                fontSize: 18,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#e63e73",
              }}
            >
              {room.subtitle}
            </div>
            <div
              style={{
                fontSize: 76,
                fontWeight: 500,
                lineHeight: 0.96,
                letterSpacing: "-0.02em",
              }}
            >
              {room.name}
            </div>
            <div style={{ fontSize: 24, lineHeight: 1.3, opacity: 0.78, marginTop: 12 }}>
              {room.short}
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, fontSize: 20 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 14, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Superficie
              </div>
              <div style={{ fontWeight: 600 }}>{formatArea(room.area)} m²</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 14, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Capacidad
              </div>
              <div style={{ fontWeight: 600 }}>hasta {cap}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
