"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";

/**
 * Renderiza Header, Footer y ChatWidget solo en rutas PÚBLICAS.
 * En /admin/* no se muestra nada de esto (el panel tiene su propio layout).
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
    </>
  );
}
