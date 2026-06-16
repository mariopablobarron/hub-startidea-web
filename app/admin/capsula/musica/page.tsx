import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { MusicaManager } from "./MusicaManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Música · Cápsula del Tiempo",
  robots: { index: false, follow: false },
};

/**
 * /admin/capsula/musica — biblioteca de pistas para poner durante las sesiones
 * de la Cápsula del Tiempo. Las pistas suenan en el invitado por el canal P2P.
 */
export default async function MusicaPage() {
  await requireAdmin();
  const tracks = await prisma.musicTrack.findMany({ orderBy: { createdAt: "desc" } });
  const items = tracks.map((t) => ({
    id: t.id,
    title: t.title,
    mime: t.mime,
    sizeBytes: t.sizeBytes,
  }));
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Cápsula · Biblioteca de música</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Sube pistas (tuyas o libres de derechos) para ponerlas durante las sesiones.
        Suenan en las gafas del invitado, a bajo volumen, desde tu panel.
      </p>
      <div className="mt-6">
        <MusicaManager items={items} />
      </div>
    </main>
  );
}
