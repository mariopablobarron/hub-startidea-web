import path from "path";

/**
 * Almacenamiento de las grabaciones de la Cápsula del Tiempo.
 *
 * El archivo vive en un VOLUMEN del VPS (bind-mount montado en
 * /app/recordings, ver docker-compose), NO en git (pesan) ni en /public
 * (son sesiones íntimas, privadas). Solo se sirven por endpoint autenticado.
 *
 * En local, sin RECORDINGS_DIR, cae a ./.recordings (gitignored).
 */
export const RECORDINGS_DIR =
  process.env.RECORDINGS_DIR || path.join(process.cwd(), ".recordings");

// Límite por grabación (1 GB). Encaja en Int de Postgres y evita llenar disco.
export const MAX_RECORDING_BYTES = 1024 * 1024 * 1024;

// Tipos MIME aceptados (lo que produce MediaRecorder en el navegador).
export const ALLOWED_RECORDING_MIME = [
  "video/webm",
  "audio/webm",
  "video/mp4",
  "audio/mp4",
  "audio/ogg",
];

// Ruta absoluta segura del archivo a partir de un nombre (evita path traversal).
export function recordingPath(filename: string): string {
  const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "");
  return path.join(RECORDINGS_DIR, safe);
}
