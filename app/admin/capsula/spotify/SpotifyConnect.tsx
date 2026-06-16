"use client";

import { Music, CheckCircle2, AlertTriangle } from "lucide-react";

export function SpotifyConnect({
  configured,
  connected,
  displayName,
  justOk,
  error,
}: {
  configured: boolean;
  connected: boolean;
  displayName: string | null;
  justOk: boolean;
  error: string | null;
}) {
  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="inline-flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} /> Falta configurar las credenciales
        </p>
        <p className="mt-2 leading-relaxed">
          Aún no están <code>SPOTIFY_CLIENT_ID</code> / <code>SPOTIFY_CLIENT_SECRET</code> en el
          servidor. Registra la app en developer.spotify.com (redirect{" "}
          <code>https://hubstartidea.es/api/admin/spotify/callback</code>) y pásame el Client ID y
          el Secret para activarlo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
      {justOk && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> Spotify conectado.
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo conectar ({error}). Inténtalo de nuevo.
        </p>
      )}

      <p className="text-sm">
        Estado:{" "}
        {connected ? (
          <span className="font-semibold text-emerald-600">
            conectado{displayName ? ` como ${displayName}` : ""}
          </span>
        ) : (
          <span className="font-semibold text-neutral-500">no conectado</span>
        )}
      </p>

      <a
        href="/api/admin/spotify/login"
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1DB954] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
      >
        <Music size={15} /> {connected ? "Reconectar Spotify" : "Conectar Spotify"}
      </a>

      <p className="mt-3 text-xs text-neutral-400 leading-relaxed">
        Para controlar la reproducción durante una sesión, ten Spotify abierto en algún dispositivo
        (móvil, ordenador o altavoz). Desde el panel de la Cápsula podrás buscar y poner canciones.
      </p>
    </div>
  );
}
