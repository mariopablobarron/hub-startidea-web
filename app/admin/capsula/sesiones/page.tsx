import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { SesionesManager } from "./SesionesManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sesiones · Cápsula del Tiempo",
  robots: { index: false, follow: false },
};

/**
 * /admin/capsula/sesiones — sesiones preparadas/vividas. Por cada una, el
 * entrevistador apunta lo que pasó y genera la "Carta del Tiempo": el recuerdo
 * escrito que se lleva la persona.
 */
export default async function SesionesPage() {
  await requireAdmin();
  const sesiones = await prisma.capsulaSession.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const items = sesiones.map((s) => ({
    id: s.id,
    guestName: s.guestName,
    sala: s.sala,
    guion: Array.isArray(s.guion)
      ? (s.guion as Array<{ texto?: string }>).map((g) => g?.texto).filter(Boolean) as string[]
      : [],
    cartaNotas: s.cartaNotas,
    carta: s.carta,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Cápsula · Sesiones</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Tras cada sesión, apunta lo que compartió la persona y genera su <b>Carta del Tiempo</b>:
        el recuerdo escrito que se lleva.
      </p>
      <div className="mt-6">
        <SesionesManager items={items} />
      </div>
    </main>
  );
}
