import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Montserrat, Montserrat_Alternates } from "next/font/google";
import "./globals.css";
import { PublicShell } from "@/components/PublicShell";
import { content } from "@/lib/content";

const site = content.site;

// Manual de Identidad Startidea · capítulo 07. Montserrat para todo el
// sistema; Montserrat Alternates para display puntual (wordmark, portadas
// de capítulo, palabras destacadas dentro de un titular largo).
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter", // nombre legado para no romper className en <html>
  display: "swap",
});

const montserratAlternates = Montserrat_Alternates({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces", // nombre legado
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Casa madre de Startidea en Granada`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: [
    "coworking Granada",
    "alquiler salas Granada",
    "estudio podcast Granada",
    "innovación social",
    "Startidea",
    "formación empresarial Granada",
    "espacio para eventos Granada",
    "sala reuniones Granada",
  ],
  authors: [{ name: site.parent.name, url: site.parent.url }],
  creator: site.parent.name,
  publisher: site.parent.name,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — Casa madre de Startidea en Granada`,
    description: site.description,
    images: [
      {
        url: "/images/og/og-default.jpg",
        width: 1200,
        height: 630,
        alt: site.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Casa madre de Startidea en Granada`,
    description: site.description,
    images: ["/images/og/og-default.jpg"],
  },
  alternates: {
    canonical: site.url,
    languages: { "es-ES": site.url, "x-default": site.url },
  },
  // Refuerzo de verificación de propiedad (además del TXT DNS).
  verification: {
    google: "mb3J5VBxlNUOCaJ97vMoEQ4VpP7yVwAhcx3em93wY60",
  },
  // En móvil iOS Safari hay autodetección de números/emails que añade un link
  // azul a "phone:" — lo dejamos solo para el teléfono real, no autoenlazamos.
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  category: "business",
};

export const viewport: Viewport = {
  // Grafito Startidea — barra de navegador en móvil
  themeColor: "#2a2a2a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-ES" className={`${montserrat.variable} ${montserratAlternates.variable}`}>
      <head>
        {/* Resource hints — acelera primer paint reduciendo handshakes */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://analytics.hubstartidea.es" />

        {/* Umami analytics (privacy-first, sin cookies) */}
        <Script
          defer
          src="https://analytics.hubstartidea.es/script.js"
          data-website-id="2c83c9c1-7b4d-4206-8f7e-551874203ef6"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--color-ink)] focus:px-4 focus:py-2 focus:text-[var(--color-paper)]"
        >
          Saltar al contenido
        </a>
        <PublicShell>{children}</PublicShell>
      </body>
    </html>
  );
}
