"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  images: string[];
  roomName: string;
  subtitle: string;
};

/**
 * Galería en /salas/[slug]:
 * - 1 imagen → render simple (igual que el legacy, full-bleed 21:9).
 * - 2+ imágenes → foto principal grande + tira de thumbnails debajo.
 *   Click en thumbnail → cambia la principal. No lightbox por ahora —
 *   añadir si Mario lo pide.
 *
 * Imagen principal mantiene `priority` para LCP — siempre la primera del array.
 */
export function RoomGalleryHero({ images, roomName, subtitle }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages = images.length > 0 ? images : ["/images/og/og-default.jpg"];
  const main = safeImages[activeIndex] ?? safeImages[0];

  if (safeImages.length === 1) {
    return (
      <div className="mt-12 relative aspect-[21/9] overflow-hidden rounded-3xl bg-[var(--color-paper-2)]">
        <Image
          src={main}
          alt={`${roomName} — ${subtitle}`}
          fill
          sizes="(min-width: 1280px) 1280px, 100vw"
          priority
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="relative aspect-[21/9] overflow-hidden rounded-3xl bg-[var(--color-paper-2)]">
        <Image
          src={main}
          alt={`${roomName} — ${subtitle} (foto ${activeIndex + 1} de ${safeImages.length})`}
          fill
          sizes="(min-width: 1280px) 1280px, 100vw"
          priority={activeIndex === 0}
          className="object-cover transition-opacity"
        />
      </div>

      <div
        role="tablist"
        aria-label={`Galería de fotos de ${roomName}`}
        className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8"
      >
        {safeImages.map((url, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={url}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Ver foto ${i + 1} de ${safeImages.length}`}
              onClick={() => setActiveIndex(i)}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--color-paper-2)] transition ${
                isActive
                  ? "ring-2 ring-[var(--color-coral-500)] ring-offset-2 ring-offset-[var(--color-paper)]"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
