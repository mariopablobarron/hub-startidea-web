"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { UploadCloud, X, ImageIcon, Plus, Trash2 } from "lucide-react";

type Props = {
  /** Foto principal — slot 0, también usada como OG image y card listado. */
  currentImage: string;
  /** Galería completa incluyendo la principal (índice 0). */
  gallery: string[];
  roomName: string;
  /** Sustituye la foto principal (slot 0). */
  action: (formData: FormData) => Promise<void>;
  /** Añade una foto adicional al final de la galería. */
  addAction: (formData: FormData) => Promise<void>;
  /** Elimina una foto por URL (no la principal). */
  removeAction: (formData: FormData) => Promise<void>;
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
export function RoomImageUploader({ currentImage, gallery, roomName, action, addAction, removeAction }: Props) {
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

      {/* Galería: fotos adicionales (slot 2+). La principal (gallery[0])
          se ve arriba y se reemplaza con el form de arriba. Las demás se
          pueden añadir aquí y quitar individualmente. */}
      <Gallery
        gallery={gallery}
        currentImage={currentImage}
        addAction={addAction}
        removeAction={removeAction}
      />
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

function Gallery({
  gallery,
  currentImage,
  addAction,
  removeAction,
}: {
  gallery: string[];
  currentImage: string;
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (formData: FormData) => Promise<void>;
}) {
  const addInputRef = useRef<HTMLInputElement>(null);
  // La principal va aparte (arriba). Aquí solo mostramos las adicionales.
  // currentImage puede tener ?v=cachebust — comparamos solo el path base.
  const principalBase = currentImage.split("?")[0];
  const additionalImages = gallery.filter((u) => u.split("?")[0] !== principalBase);
  const max = 8;
  const canAdd = gallery.length < max;

  return (
    <div className="border-t border-[var(--color-line)] pt-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-base">Galería ({gallery.length}/{max})</h3>
        <span className="text-xs text-[var(--color-mute)]">
          Fotos adicionales que el visitante ve en la página de la sala.
        </span>
      </div>

      {additionalImages.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-mute)]">
          Aún no hay fotos adicionales. Añade hasta {max - 1} más para mostrar diferentes
          ángulos / configuraciones.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {additionalImages.map((url) => {
            const baseUrl = url.split("?")[0];
            return (
              <li key={baseUrl} className="group relative aspect-[16/10] overflow-hidden rounded-xl bg-[var(--color-paper-2)]">
                <Image src={url} alt="Foto adicional" fill sizes="320px" className="object-cover" />
                <form action={removeAction} className="absolute right-2 top-2">
                  <input type="hidden" name="url" value={baseUrl} />
                  <RemoveButton />
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {canAdd && (
        <form
          action={addAction}
          encType="multipart/form-data"
          className="mt-4 flex flex-wrap items-center gap-3"
        >
          <input
            ref={addInputRef}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            required
            onChange={(e) => {
              if (e.target.files?.[0]) {
                (e.target.form as HTMLFormElement).requestSubmit();
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => addInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-mute)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
          >
            <Plus size={14} /> Añadir foto adicional
          </button>
          <AddSubmitFeedback />
        </form>
      )}
    </div>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-red-700 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-red-50 disabled:opacity-50"
      aria-label="Quitar foto"
      title="Quitar foto"
    >
      {pending ? <span className="text-xs">…</span> : <Trash2 size={14} />}
    </button>
  );
}

function AddSubmitFeedback() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return <span className="text-xs text-[var(--color-mute)]">Subiendo y optimizando…</span>;
}
