"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import { auth } from "@/auth";
import { commitFile, triggerRedeploy } from "./persist";
import contentJson from "@/data/content.json";
import type { Room } from "@/lib/content";
import {
  heroSchema,
  roomSchema,
  communitySchema,
  contactSchema,
  siteSchema,
  manifestoSchema,
  methodRaizAccionSchema,
  ecosystemSchema,
} from "./schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
}

type ContentJson = typeof contentJson;

async function saveContent(next: ContentJson, message: string) {
  const json = JSON.stringify(next, null, 2) + "\n";
  await commitFile({ path: "data/content.json", content: json, message });
  revalidatePath("/", "layout");
  await triggerRedeploy();
}

/** Wrapper que redirige a la misma página con feedback. */
async function withFeedback(
  redirectPath: string,
  fn: () => Promise<void>,
): Promise<never> {
  try {
    await fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Si es un redirect interno de Next, déjalo pasar
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    redirect(`${redirectPath}?error=${encodeURIComponent(msg.slice(0, 200))}`);
  }
  redirect(`${redirectPath}?saved=1`);
}

export async function updateHero(formData: FormData) {
  return withFeedback("/admin/hero", async () => {
    await requireAdmin();
    const data = heroSchema.parse({
      eyebrow: formData.get("eyebrow"),
      titleStart: formData.get("titleStart") || "",
      titleEm: formData.get("titleEm"),
      titleEnd: formData.get("titleEnd") || "",
      subtitle: formData.get("subtitle"),
      ctaPrimary: formData.get("ctaPrimary"),
      ctaSecondary: formData.get("ctaSecondary"),
      rotatingTagline: formData.get("rotatingTagline") || "",
      rotatingWords: String(formData.get("rotatingWords") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      stats: [0, 1, 2, 3].map((i) => ({
        value: String(formData.get(`stat-${i}-value`) || ""),
        suffix: String(formData.get(`stat-${i}-suffix`) || "") || undefined,
        label: String(formData.get(`stat-${i}-label`) || ""),
        isText: formData.get(`stat-${i}-isText`) === "on" || undefined,
      })),
    });
    const next = { ...contentJson, hero: data } as ContentJson;
    await saveContent(next, "feat(admin): actualizar Hero");
  });
}

export async function updateContact(formData: FormData) {
  return withFeedback("/admin/contacto", async () => {
    await requireAdmin();
    const data = contactSchema.parse({
      eyebrow: formData.get("eyebrow"),
      title: formData.get("title"),
      description: formData.get("description"),
      schedule: formData.get("schedule"),
      directions: formData.get("directions"),
    });
    const next = { ...contentJson, contact: data } as ContentJson;
    await saveContent(next, "feat(admin): actualizar Contacto");
  });
}

export async function updateCommunity(formData: FormData) {
  return withFeedback("/admin/comunidad", async () => {
    await requireAdmin();
    const data = communitySchema.parse({
      eyebrow: formData.get("eyebrow"),
      titleStart: formData.get("titleStart") || "",
      titleEm: formData.get("titleEm"),
      description: formData.get("description"),
      pillars: [0, 1, 2].map((i) => ({
        icon: String(formData.get(`pillar-${i}-icon`) || "Sparkles"),
        title: String(formData.get(`pillar-${i}-title`) || ""),
        text: String(formData.get(`pillar-${i}-text`) || ""),
      })),
    });
    const next = { ...contentJson, community: data } as ContentJson;
    await saveContent(next, "feat(admin): actualizar Comunidad");
  });
}

export async function updateSite(formData: FormData) {
  return withFeedback("/admin/sitio", async () => {
    await requireAdmin();
    const data = siteSchema.parse({
      name: formData.get("name"),
      tagline: formData.get("tagline") || "",
      description: formData.get("description") || "",
      url: formData.get("url"),
      phone: formData.get("phone"),
      phoneDisplay: formData.get("phoneDisplay"),
      email: formData.get("email"),
      address: {
        street: formData.get("addressStreet"),
        city: formData.get("addressCity"),
        postal: formData.get("addressPostal"),
        country: formData.get("addressCountry"),
      },
      social: {
        instagram: formData.get("instagram"),
        facebook: formData.get("facebook"),
      },
      parent: {
        name: formData.get("parentName"),
        url: formData.get("parentUrl"),
      },
    });
    const next = { ...contentJson, site: data } as ContentJson;
    await saveContent(next, "feat(admin): actualizar Datos generales del sitio");
  });
}

export async function updateRoom(slug: string, formData: FormData) {
  return withFeedback(`/admin/salas/${slug}`, async () => {
    await requireAdmin();
    const existing = contentJson.rooms.find((r) => r.slug === slug);
    if (!existing) throw new Error("Sala no encontrada");

    const data = roomSchema.parse({
    slug: existing.slug,
    name: formData.get("name"),
    subtitle: formData.get("subtitle"),
    category: existing.category,
    // Checkbox: si está marcado viene como "on"; si no, no viene la key.
    bookable: formData.get("bookable") === "on",
    area: formData.get("area"),
    capacity: {
      school: formData.get("capacitySchool") || 0,
      theater: formData.get("capacityTheater") || 0,
      boardroom: formData.get("capacityBoardroom") || undefined,
      coctel: formData.get("capacityCoctel") || undefined,
    },
    short: formData.get("short"),
    description: formData.get("description"),
    uses: String(formData.get("uses") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    equipment: String(formData.get("equipment") || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    highlight: String(formData.get("highlight") || "") || undefined,
    planLabel: formData.get("planLabel"),
    image: formData.get("image") || existing.image,
  });

    const next: ContentJson = {
      ...contentJson,
      rooms: contentJson.rooms.map((r) => (r.slug === slug ? data : r)),
    } as ContentJson;
    await saveContent(next, `feat(admin): actualizar sala ${slug}`);
  });
}

/**
 * Optimiza un File subido → JPG 1600px max + quality 82 (sharp + mozjpeg).
 * Respeta orientación EXIF (móviles giran al colgar).
 */
async function optimizeRoomImage(file: File): Promise<Buffer> {
  if (file.size > 15 * 1024 * 1024) throw new Error("Imagen demasiado grande (máx 15 MB)");
  const inputExt = (file.type.split("/")[1] || "").replace("jpeg", "jpg");
  const allowedInput = ["jpg", "png", "webp", "heic", "heif"];
  if (!allowedInput.includes(inputExt)) {
    throw new Error(`Formato no permitido (${inputExt}). Usa jpg, png, webp o heic.`);
  }
  const inputBuf = Buffer.from(await file.arrayBuffer());
  return sharp(inputBuf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true, fit: "inside" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

/**
 * Sube foto principal (slot 0). Mantiene compat con sistema legacy:
 * archivo en `{slug}.jpg`, actualiza `room.image` y `room.images[0]`.
 */
export async function uploadRoomImage(slug: string, formData: FormData): Promise<never> {
  return withFeedback(`/admin/salas/${slug}`, async () => {
    await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No se ha enviado archivo");

    const optimized = await optimizeRoomImage(file);
    const path = `public/images/rooms/${slug}.jpg`;
    const publicPath = `/images/rooms/${slug}.jpg`;
    await commitFile({ path, content: optimized, message: `feat(admin): subir foto principal de ${slug}` });

    // Sincronizar tanto image (compat) como images[0] (galería).
    const room = contentJson.rooms.find((r) => r.slug === slug);
    const currentImages = (room as Room | undefined)?.images;
    const needsUpdate =
      room?.image !== publicPath ||
      !currentImages ||
      currentImages[0] !== publicPath;

    if (needsUpdate) {
      const newImages = currentImages && currentImages.length > 0
        ? [publicPath, ...currentImages.filter((u) => u !== publicPath)]
        : [publicPath];
      const next: ContentJson = {
        ...contentJson,
        rooms: contentJson.rooms.map((r) =>
          r.slug === slug ? { ...r, image: publicPath, images: newImages } : r,
        ),
      } as ContentJson;
      await saveContent(next, `feat(admin): foto principal de ${slug}`);
    } else {
      revalidatePath("/", "layout");
      await triggerRedeploy();
    }
  });
}

/**
 * Añade foto adicional a la galería (slot >0). Se guarda como
 * `{slug}-{N}.jpg` donde N es el primer slot libre (≥2). El admin no
 * elige el número — siempre añade al final.
 */
export async function addRoomImage(slug: string, formData: FormData): Promise<never> {
  return withFeedback(`/admin/salas/${slug}`, async () => {
    await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No se ha enviado archivo");

    const room = contentJson.rooms.find((r) => r.slug === slug) as Room | undefined;
    if (!room) throw new Error("Sala no encontrada");

    const current = room.images && room.images.length > 0 ? room.images : [room.image];
    if (current.length >= 8) {
      throw new Error("Máximo 8 fotos por sala. Borra alguna antes de añadir más.");
    }

    // Slot: el primer N≥2 que no esté en uso (mira los paths existentes).
    // Numeramos a partir de 2 porque {slug}.jpg es el principal (slot 1 conceptual).
    let slot = 2;
    while (current.some((u) => u.endsWith(`-${slot}.jpg`))) slot++;
    const path = `public/images/rooms/${slug}-${slot}.jpg`;
    const publicPath = `/images/rooms/${slug}-${slot}.jpg`;

    const optimized = await optimizeRoomImage(file);
    await commitFile({ path, content: optimized, message: `feat(admin): añadir foto ${slot} a ${slug}` });

    const next: ContentJson = {
      ...contentJson,
      rooms: contentJson.rooms.map((r) =>
        r.slug === slug ? { ...r, images: [...current, publicPath] } : r,
      ),
    } as ContentJson;
    await saveContent(next, `feat(admin): foto adicional ${slot} de ${slug}`);
  });
}

/**
 * Elimina una foto de la galería. La principal (slot 0) NO se borra
 * por aquí — se reemplaza con uploadRoomImage. Solo limpia entradas
 * de images[] (no borra el archivo físico, queda huérfano en /public
 * — costo despreciable y reversible si Mario lo quiere reactivar).
 */
export async function removeRoomImage(slug: string, formData: FormData): Promise<never> {
  return withFeedback(`/admin/salas/${slug}`, async () => {
    await requireAdmin();
    const url = String(formData.get("url") || "");
    if (!url) throw new Error("Falta URL de la foto a eliminar");

    const room = contentJson.rooms.find((r) => r.slug === slug) as Room | undefined;
    if (!room) throw new Error("Sala no encontrada");
    if (url === room.image) {
      throw new Error("No se puede borrar la foto principal — reemplázala subiendo otra.");
    }
    const current = room.images && room.images.length > 0 ? room.images : [];
    if (!current.includes(url)) throw new Error("La foto no está en la galería");

    const filtered = current.filter((u) => u !== url);
    const next: ContentJson = {
      ...contentJson,
      rooms: contentJson.rooms.map((r) =>
        r.slug === slug ? { ...r, images: filtered } : r,
      ),
    } as ContentJson;
    await saveContent(next, `feat(admin): quitar foto de ${slug}`);
  });
}

// ============================================================
// Manifesto / Método Raíz y Acción / Ecosistema — copy editable
// ============================================================

export async function updateManifesto(formData: FormData) {
  return withFeedback("/admin/manifiesto", async () => {
    await requireAdmin();
    const data = manifestoSchema.parse({
      eyebrow: formData.get("eyebrow"),
      title: formData.get("title"),
      intro: formData.get("intro"),
      pillars: [0, 1].map((i) => ({
        label: formData.get(`pillar-${i}-label`),
        title: formData.get(`pillar-${i}-title`),
        description: formData.get(`pillar-${i}-description`),
        ctaLabel: formData.get(`pillar-${i}-ctaLabel`),
        ctaHref: formData.get(`pillar-${i}-ctaHref`),
        items: String(formData.get(`pillar-${i}-items`) || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      })),
    });
    const next = { ...contentJson, manifesto: data } as ContentJson;
    await saveContent(next, "feat(admin): actualizar Manifiesto");
  });
}

export async function updateMethodRaizAccion(formData: FormData) {
  return withFeedback("/admin/metodo", async () => {
    await requireAdmin();
    // Los steps los parseamos del formato "step|title|description" línea-a-línea
    const stepsRaw = String(formData.get("steps") || "");
    const steps = stepsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        if (parts.length !== 3) {
          throw new Error(
            `Paso mal formado: "${line}" — debe ser "número|título|descripción"`,
          );
        }
        return { step: parts[0], title: parts[1], description: parts[2] };
      });

    const data = methodRaizAccionSchema.parse({
      eyebrow: formData.get("eyebrow"),
      label: formData.get("label"),
      title: formData.get("title"),
      description: formData.get("description"),
      url: formData.get("url"),
      ctaLabel: formData.get("ctaLabel"),
      steps,
    });
    const next = { ...contentJson, methodRaizAccion: data } as ContentJson;
    await saveContent(next, "feat(admin): actualizar Método Raíz y Acción");
  });
}

export async function updateEcosystem(formData: FormData) {
  return withFeedback("/admin/ecosistema", async () => {
    await requireAdmin();
    // Cada proyecto en una línea: "name|tagline|url|accent"
    const projectsRaw = String(formData.get("projects") || "");
    const projects = projectsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        if (parts.length !== 4) {
          throw new Error(
            `Proyecto mal formado: "${line}" — debe ser "nombre|tagline|url|accent". Accents válidos: coral, warm, earth, ink`,
          );
        }
        return {
          name: parts[0],
          tagline: parts[1],
          url: parts[2],
          accent: parts[3] as "coral" | "warm" | "earth" | "ink",
        };
      });

    const data = ecosystemSchema.parse({
      eyebrow: formData.get("eyebrow"),
      title: formData.get("title"),
      description: formData.get("description"),
      ctaLabel: formData.get("ctaLabel"),
      ctaUrl: formData.get("ctaUrl"),
      projects,
    });
    const next = { ...contentJson, ecosystem: data } as ContentJson;
    await saveContent(next, "feat(admin): actualizar Ecosistema Startidea");
  });
}

// ============================================================
// Datos bancarios para pago por transferencia
// ============================================================

const bankTransferSchema = z.object({
  enabled: z.boolean(),
  holder: z.string().max(140),
  iban: z.string().max(60),
  bankName: z.string().max(140),
  instructions: z.string().max(1000),
});

export async function updateBankTransfer(formData: FormData) {
  return withFeedback("/admin/pagos", async () => {
    await requireAdmin();
    const data = bankTransferSchema.parse({
      enabled: formData.get("enabled") === "on" || formData.get("enabled") === "true",
      holder: (formData.get("holder") as string) || "",
      // Normaliza el IBAN: sin espacios y en mayúsculas.
      iban: ((formData.get("iban") as string) || "").replace(/\s+/g, "").toUpperCase(),
      bankName: (formData.get("bankName") as string) || "",
      instructions: (formData.get("instructions") as string) || "",
    });
    const next = { ...contentJson, bankTransfer: data } as ContentJson;
    await saveContent(next, "chore(admin): actualizar datos de transferencia");
  });
}
