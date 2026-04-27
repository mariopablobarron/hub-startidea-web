import { z } from "zod";

const capacitySchema = z.object({
  school: z.coerce.number().min(0),
  theater: z.coerce.number().min(0),
  boardroom: z.coerce.number().min(0).optional(),
  coctel: z.coerce.number().min(0).optional(),
});

export const roomSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  subtitle: z.string().min(1),
  category: z.enum(["sala", "coworking", "estudio", "office", "comun"]),
  area: z.coerce.number().min(0),
  capacity: capacitySchema,
  short: z.string().min(1),
  description: z.string().min(1),
  uses: z.array(z.string()),
  equipment: z.array(z.string()),
  highlight: z.string().optional(),
  planLabel: z.string().min(1),
  image: z.string().min(1),
});

export const heroSchema = z.object({
  eyebrow: z.string().min(1),
  titleStart: z.string(),
  titleEm: z.string().min(1),
  titleEnd: z.string(),
  subtitle: z.string().min(1),
  ctaPrimary: z.string().min(1),
  ctaSecondary: z.string().min(1),
  rotatingTagline: z.string(),
  rotatingWords: z.array(z.string()).min(1),
  stats: z.array(
    z.object({
      value: z.string().min(1),
      suffix: z.string().optional(),
      label: z.string().min(1),
      isText: z.boolean().optional(),
    })
  ),
});

export const communitySchema = z.object({
  eyebrow: z.string().min(1),
  titleStart: z.string(),
  titleEm: z.string().min(1),
  description: z.string().min(1),
  pillars: z.array(
    z.object({
      icon: z.string(),
      title: z.string().min(1),
      text: z.string().min(1),
    })
  ),
});

export const contactSchema = z.object({
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  schedule: z.string().min(1),
  directions: z.string().min(1),
});

export const siteSchema = z.object({
  name: z.string().min(1),
  tagline: z.string(),
  description: z.string(),
  url: z.string().url(),
  phone: z.string().min(1),
  phoneDisplay: z.string().min(1),
  email: z.string().email(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    postal: z.string().min(1),
    country: z.string().min(1),
  }),
  social: z.object({
    instagram: z.string().url(),
    facebook: z.string().url(),
  }),
  parent: z.object({
    name: z.string().min(1),
    url: z.string().url(),
  }),
});
