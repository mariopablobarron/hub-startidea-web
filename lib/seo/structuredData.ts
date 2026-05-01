import { content, rooms, type Room } from "@/lib/content";

const site = content.site;

/** LocalBusiness schema para la home — clave para SEO local en Google. */
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${site.url}/#localbusiness`,
    name: site.name,
    description: site.description,
    url: site.url,
    telephone: site.phone,
    email: site.email,
    image: `${site.url}/images/og/og-default.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      postalCode: site.address.postal,
      addressCountry: "ES",
    },
    sameAs: [site.social.instagram, site.social.facebook].filter(Boolean),
    parentOrganization: {
      "@type": "Organization",
      name: site.parent.name,
      url: site.parent.url,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "20:00",
      },
    ],
    geo: {
      "@type": "GeoCoordinates",
      latitude: 37.1729,
      longitude: -3.5969,
    },
    areaServed: { "@type": "City", name: "Granada" },
  };
}

/** Coworking-specific schema apuntando al edificio. */
export function coworkingSpaceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CoworkingSpace",
    "@id": `${site.url}/#coworking`,
    name: site.name,
    url: site.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      postalCode: site.address.postal,
      addressCountry: "ES",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Wifi de fibra simétrica" },
      { "@type": "LocationFeatureSpecification", name: "Café ilimitado" },
      { "@type": "LocationFeatureSpecification", name: "Impresora" },
      { "@type": "LocationFeatureSpecification", name: "Accesibilidad" },
      { "@type": "LocationFeatureSpecification", name: "Estudio de podcast" },
      { "@type": "LocationFeatureSpecification", name: "Salas de formación" },
    ],
  };
}

/** WebSite con SearchAction (Google sitelinks). */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: site.url,
    inLanguage: "es-ES",
    publisher: { "@id": `${site.url}/#localbusiness` },
  };
}

/** Servicio (sala individual) — schema Product / Service. */
export function roomServiceSchema(room: Room) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${room.name} · ${site.name}`,
    description: room.description,
    image: `${site.url}${room.image}`,
    provider: { "@id": `${site.url}/#localbusiness` },
    serviceType: room.subtitle,
    areaServed: { "@type": "City", name: "Granada" },
    url: `${site.url}/salas/${room.slug}`,
  };
}

/** Breadcrumbs reutilizable. */
export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** ItemList del catálogo de salas. */
export function roomsItemListSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: rooms.length,
    itemListElement: rooms.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${site.url}/salas/${r.slug}`,
      name: r.name,
    })),
  };
}
