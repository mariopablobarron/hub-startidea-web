"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { commitFile, triggerRedeploy } from "./persist";
import contentJson from "@/data/content.json";
import { heroSchema, roomSchema, communitySchema, contactSchema, siteSchema } from "./schema";

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
    if (file.size > 5 * 1024 * 1024) throw new Error("Imagen demasiado grande (máx 5 MB)");
    const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const allowed = ["jpg", "png", "webp"];
    if (!allowed.includes(ext)) throw new Error(`Formato no permitido (${ext}). Usa jpg, png o webp.`);
    const path = `public/images/rooms/${slug}.${ext}`;
    const publicPath = `/images/rooms/${slug}.${ext}`;

    const buf = Buffer.from(await file.arrayBuffer());
    await commitFile({ path, content: buf, message: `feat(admin): subir foto de ${slug}` });

    const next: ContentJson = {
      ...contentJson,
      rooms: contentJson.rooms.map((r) =>
        r.slug === slug ? { ...r, image: publicPath } : r,
      ),
    } as ContentJson;
    await saveContent(next, `feat(admin): apuntar imagen de ${slug} a ${publicPath}`);
  });
}
