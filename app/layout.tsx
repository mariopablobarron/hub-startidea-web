import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { PublicShell } from "@/components/PublicShell";
import { content } from "@/lib/content";

const site = content.site;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
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
  alternates: { canonical: site.url },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <head>
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
