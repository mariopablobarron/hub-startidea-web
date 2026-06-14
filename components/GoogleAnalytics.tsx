"use client";

// GA4 (G-TKT2EV27FX) para hubstartidea.es, GATEADO por el banner de cookies.
// Solo carga gtag si el usuario ACEPTÓ (localStorage "hub-cookie-consent" ===
// "accepted"). Reacciona al evento "hub-consent-changed" que dispara
// CookieBanner al aceptar, así el primer "Aceptar" carga GA4 sin recargar.
// Umami (sin cookies) sigue cargando aparte en el layout; esto añade GA4 para
// medición completa (incl. tráfico de redes). IP anonimizada (RGPD).

import { useEffect, useState } from "react";
import Script from "next/script";

const GA4_ID = "G-TKT2EV27FX";
const STORAGE_KEY = "hub-cookie-consent";

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        if (localStorage.getItem(STORAGE_KEY) === "accepted") setEnabled(true);
      } catch {
        /* localStorage bloqueado: no cargamos analítica */
      }
    };
    check();
    window.addEventListener("hub-consent-changed", check);
    return () => window.removeEventListener("hub-consent-changed", check);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
