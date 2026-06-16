import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { spotifyConfigured } from "@/lib/capsula/spotify";
import { SpotifyConnect } from "./SpotifyConnect";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Spotify · Cápsula del Tiempo",
  robots: { index: false, follow: false },
};

export default async function SpotifyPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const auth = await prisma.spotifyAuth.findUnique({ where: { id: "default" } });
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold">Cápsula · Spotify</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Conecta tu cuenta de Spotify (Premium) para controlar la música desde el panel en
        sesiones presenciales. Suena en el dispositivo donde tengas Spotify abierto.
      </p>
      <div className="mt-6">
        <SpotifyConnect
          configured={spotifyConfigured()}
          connected={!!auth}
          displayName={auth?.displayName ?? null}
          justOk={sp.ok === "1"}
          error={sp.error ?? null}
        />
      </div>
    </main>
  );
}
