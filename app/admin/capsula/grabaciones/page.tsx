import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { RecordingsManager } from "./RecordingsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Grabaciones · Cápsula del Tiempo",
  robots: { index: false, follow: false },
};

/**
 * /admin/capsula/grabaciones — sesiones grabadas de la Cápsula del Tiempo.
 * Solo ADMIN. El archivo se sirve por /api/capsula/recordings/[id] (también
 * protegido). Son sesiones íntimas: nunca públicas.
 */
export default async function GrabacionesPage() {
  await requireAdmin();
  const recs = await prisma.recording.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const items = recs.map((r) => ({
    id: r.id,
    sala: r.sala,
    kind: r.kind as "AUDIO" | "VIDEO",
    mime: r.mime,
    sizeBytes: r.sizeBytes,
    durationSec: r.durationSec,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Cápsula del Tiempo · Grabaciones</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Sesiones grabadas (lo que ve, habla y escucha la persona). Privadas: solo visibles aquí.
      </p>
      <div className="mt-6">
        <RecordingsManager items={items} />
      </div>
    </main>
  );
}
