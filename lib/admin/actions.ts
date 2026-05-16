"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { auth } from "@/auth";
import { commitFile, triggerRedeploy } from "./persist";
import contentJson from "@/data/content.json";
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

export async function uploadRoomImage(slug: string, formData: FormData): Promise<never> {
  return withFeedback(`/admin/salas/${slug}`, async () => {
    await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No se ha enviado archivo");
    // Aceptamos hasta 15 MB en entrada (móviles modernos sacan fotos de 8-12 MB);
    // sharp reduce el peso final >90% antes del commit.
    if (file.size > 15 * 1024 * 1024) throw new Error("Imagen demasiado grande (máx 15 MB)");
    const inputExt = (file.type.split("/")[1] || "").replace("jpeg", "jpg");
    const allowedInput = ["jpg", "png", "webp", "heic", "heif"];
    if (!allowedInput.includes(inputExt)) {
      throw new Error(`Formato no permitido (${inputExt}). Usa jpg, png, webp o heic.`);
    }

    // Optimización: redimensionar a max 1600px de ancho y comprimir a JPG quality 82.
    // Mantener .jpg como extensión final asegura consistencia con el resto del sitio
    // (OG images, Image src, etc.) y next/image servirá WebP/AVIF al navegador.
    const inputBuf = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(inputBuf)
      .rotate() // respeta EXIF orientation (móviles giran las fotos al colgarlas)
      .resize({ width: 1600, withoutEnlargement: true, fit: "inside" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    const path = `public/images/rooms/${slug}.jpg`;
    const publicPath = `/images/rooms/${slug}.jpg`;

    await commitFile({ path, content: optimized, message: `feat(admin): subir foto de ${slug}` });

    // Si el path no cambia (siempre .jpg) no hace falta tocar content.json salvo
    // que la sala apuntara antes a otra extensión. Lo dejamos coherente por si acaso.
    if (contentJson.rooms.find((r) => r.slug === slug)?.image !== publicPath) {
      const next: ContentJson = {
        ...contentJson,
        rooms: contentJson.rooms.map((r) =>
          r.slug === slug ? { ...r, image: publicPath } : r,
        ),
      } as ContentJson;
      await saveContent(next, `feat(admin): apuntar imagen de ${slug} a ${publicPath}`);
    } else {
      // Solo necesitamos invalidar la cache y forzar redeploy para servir la nueva imagen.
      revalidatePath("/", "layout");
      await triggerRedeploy();
    }
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
