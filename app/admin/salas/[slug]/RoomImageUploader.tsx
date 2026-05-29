"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { UploadCloud, X, ImageIcon } from "lucide-react";

type Props = {
  currentImage: string;
  roomName: string;
  action: (formData: FormData) => Promise<void>;
};

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * Uploader con:
 * - Preview client-side ANTES de subir (FileReader)
 * - Drag & drop sobre la zona de upload
 * - Indicador de tamaño + tipo del archivo seleccionado
 * - Validación frontend espejo de la del server (15 MB + formatos)
 * - Botón submit con loading state via useFormStatus
 *
 * Sigue posteando al form action `uploadRoomImage` original — no
 * cambia la lógica de servidor.
 */
export function RoomImageUploader({ currentImage, roomName, action }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`Demasiado grande (${(f.size / 1024 / 1024).toFixed(1)} MB). Máximo 15 MB.`);
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ALLOWED.includes(f.type) && f.type !== "") {
      // f.type "" suele pasar con HEIC en iOS Safari — dejamos pasar
      setError(`Formato no soportado (${f.type}). Usa jpg, png, webp o heic.`);
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    // HEIC no se previsualiza en navegador (sin soporte nativo); mostramos
    // un placeholder en lugar de intentar leerlo y romper.
    const isHeic =
      /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);
    if (isHeic) {
      setPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.onerror = () => setError("No se pudo leer la imagen.");
    reader.readAsDataURL(f);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const isHeic = file
    ? /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
    : false;

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
    >
      <h2 className="font-display text-lg">Foto de la sala</h2>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Columna izquierda: foto actual + preview futura */}
        <div className="flex shrink-0 flex-col gap-3">
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--color-mute)]">
              Actual
            </div>
            <div className="relative aspect-[16/10] w-64 overflow-hidden rounded-xl bg-[var(--color-paper-2)]">
              <Image
                src={currentImage}
                alt={roomName}
                fill
                sizes="256px"
                className="object-cover"
              />
            </div>
          </div>

          {(preview || isHeic) && (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-emerald-700">
                  Nueva → al subir
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  className="inline-flex items-center gap-1 text-[10px] text-[var(--color-mute)] hover:text-[var(--color-ink)]"
                  aria-label="Descartar imagen seleccionada"
                >
                  <X size={10} /> Quitar
                </button>
              </div>
              <div className="relative aspect-[16/10] w-64 overflow-hidden rounded-xl bg-[var(--color-paper-2)] ring-2 ring-emerald-400">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Preview de la nueva foto"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-center text-xs text-[var(--color-mute)]">
                    <div>
                      <ImageIcon size={20} className="mx-auto mb-1" />
                      HEIC sin preview
                      <div className="text-[10px]">se convierte al subir</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: dropzone + info + submit */}
        <div className="flex-1 space-y-3">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) {
                handleFile(dropped);
                // Sync input value so the form submit envía el archivo
                if (inputRef.current) {
                  const dt = new DataTransfer();
                  dt.items.add(dropped);
                  inputRef.current.files = dt.files;
                }
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
              dragOver
                ? "border-[var(--color-coral-500)] bg-[var(--color-coral-50)]"
                : file
                ? "border-emerald-400 bg-emerald-50"
                : "border-[var(--color-line)] bg-[var(--color-paper-2)] hover:border-[var(--color-ink)]"
            }`}
          >
            <UploadCloud
              size={28}
              className={dragOver || file ? "text-[var(--color-ink)]" : "text-[var(--color-mute)]"}
            />
            {file ? (
              <div className="text-sm">
                <div className="font-medium text-[var(--color-ink)]">{file.name}</div>
                <div className="text-xs text-[var(--color-mute)]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "—"}
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <div className="font-medium text-[var(--color-ink)]">
                  Arrastra una foto aquí
                </div>
                <div className="text-xs text-[var(--color-mute)]">
                  o haz click para elegir desde tu dispositivo
                </div>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              required
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="text-xs text-[var(--color-mute)]">
            JPG, PNG, WebP o HEIC (móvil). Máximo 15 MB. Se redimensiona a 1600 px y se
            guarda como{" "}
            <code className="rounded bg-[var(--color-paper-2)] px-1">
              public/images/rooms/&lt;slug&gt;.jpg
            </code>
            , reemplazando la actual.
          </div>

          <SubmitButton disabled={!file || !!error} />
        </div>
      </div>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Subiendo y optimizando…" : "Subir y aplicar"}
    </button>
  );
}
