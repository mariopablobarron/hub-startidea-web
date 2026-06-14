"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { CookieBanner } from "@/components/CookieBanner";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { VoiceWidget } from "@/components/VoiceWidget";

/**
 * Renderiza Header, Footer, ChatWidget, VoiceWidget y CookieBanner solo
 * en rutas PÚBLICAS. En /admin/* no se muestra nada (el panel tiene su
 * propio layout).
 *
 * VoiceWidget convive con ChatWidget (texto). El usuario elige: hablar
 * o escribir. VoiceWidget se monta solo si NEXT_PUBLIC_ELEVENLABS_AGENT_ID
 * está definido en env; si no, es null inerte.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <ChatWidget />
      <VoiceWidget />
      <CookieBanner />
      <GoogleAnalytics />
    </>
  );
}
