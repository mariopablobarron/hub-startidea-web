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

/**
 * Organization schema con Startidea como entidad matriz Y el hub como
 * sede. Refuerza la relación "Startidea opera el HUB" para Google y
 * enlaza los proyectos hermanos como subOrganization/sameAs para que
 * Google entienda el ecosistema completo (knowledge graph).
 */
export function organizationSchema() {
  const projects = content.ecosystem?.projects || [];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${site.parent.url}/#organization`,
    name: site.parent.name,
    url: site.parent.url,
    description:
      "Agencia de innovación social que diseña, lanza y acompaña proyectos con propósito.",
    location: {
      "@type": "Place",
      name: site.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: site.address.street,
        addressLocality: site.address.city,
        postalCode: site.address.postal,
        addressCountry: "ES",
      },
    },
    subOrganization: projects.map((p) => ({
      "@type": "Organization",
      name: p.name,
      url: p.url,
    })),
    sameAs: projects.map((p) => p.url),
  };
}

/**
 * FAQPage schema — Google muestra estas Q&A como rich snippet en SERP.
 * Las preguntas vienen del contenido público (no del chatbot FAQ que aún
 * tiene "PENDIENTE" en las tarifas). Cuando completes esas tarifas en
 * /admin/faq, podemos extender este schema con esas Q&A.
 */
export function faqSchema() {
  const eco = content.ecosystem;
  const projects = eco?.projects || [];

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: "¿Dónde está el HUB Startidea?",
      a: `En el centro de Granada, en ${site.address.street}, ${site.address.postal} ${site.address.city}. Bien comunicado con metro y autobús (paradas de Recogidas y Camino de Ronda) y con parking cercano (Granados / Ronda Centro).`,
    },
    {
      q: "¿Qué se puede hacer en el HUB Startidea?",
      a: "Alquilar salas para formaciones, eventos y reuniones; grabar en el estudio de podcast; trabajar desde el coworking; participar en la comunidad y los proyectos de Startidea. El HUB es tanto un espacio físico abierto a la calle como la sede operativa de la agencia de innovación social Startidea.",
    },
    {
      q: "¿Quién está detrás del HUB?",
      a: `${site.parent.name}, una agencia de innovación social con más de una década acompañando proyectos con propósito. El HUB es su sede física y el lugar donde se cocinan sus proyectos: Tres mil millones de latidos, Raíz y Acción y TodoMerchandising.`,
    },
    {
      q: "¿Cuántas salas tiene el HUB y para qué sirven?",
      a: `El HUB tiene ${rooms.length} espacios alquilables: aulas de formación, salas de reuniones, una sala grande multifunción (CC33), un estudio de podcast profesional, una zona de coworking abierta y un office privado. Cada sala está pensada para usos distintos — formaciones, eventos, presentaciones, grabaciones — y mobiliario reconfigurable.`,
    },
    {
      q: "¿Hay coworking en el HUB?",
      a: "Sí. El HUB ofrece plazas de coworking abierto y un office privado. Incluye wifi de fibra simétrica, café ilimitado, impresora, accesibilidad y acceso al estudio de podcast bajo reserva.",
    },
    {
      q: "¿Cómo reservo una sala o agendo una visita?",
      a: `Lo más rápido es escribir al formulario de contacto en ${site.url}/#contacto. También puedes llamar al ${site.phoneDisplay} en horario de oficina, o enviar un email a ${site.email}. Te respondemos en menos de 24 horas laborables.`,
    },
    {
      q: "¿Qué es el método Raíz y Acción?",
      a: "Es la metodología que Startidea ha desarrollado a lo largo de más de una década acompañando proyectos. Cuatro fases —Raíz, Tronco, Ramas, Acción— para llevar una idea desde su raíz (porqué, personas, contexto) hasta la acción tangible (prototipos, decisiones, lanzamiento). Lo aplicamos en proyectos reales y se publica abierto para que cualquiera lo use.",
    },
    {
      q: "¿Puedo grabar un podcast en el HUB?",
      a: "Sí. El HUB tiene un estudio de podcast profesional acondicionado, con equipo de grabación, micrófonos de calidad y soporte técnico opcional. Se puede reservar por sesiones o por bonos para series. Escríbenos al formulario para presupuesto.",
    },
    {
      q: "¿Qué proyectos forman parte del ecosistema Startidea?",
      a: `Hoy son cuatro: ${projects.map((p) => p.name).join(", ")}. Todos se gestionan desde el HUB y comparten un mismo principio: ideas con propósito que se llevan a la acción.`,
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

/**
 * Service schemas — un schema por servicio principal del HUB. Ayuda a
 * Google a entender el negocio como múltiples ofertas distintas en lugar
 * de "coworking" genérico.
 */
export function servicesSchema() {
  const services = [
    {
      name: "Alquiler de salas para formación y eventos",
      description:
        "Salas multifunción para impartir formación, presentar proyectos, hacer eventos y reuniones. Mobiliario reconfigurable, pantallas, conexión a Internet de fibra.",
      areaServed: "Granada",
      url: `${site.url}/#salas`,
    },
    {
      name: "Coworking en el centro de Granada",
      description:
        "Plaza fija o flex en el espacio de coworking del HUB. Incluye wifi simétrico, café, impresora y acceso a las áreas comunes.",
      areaServed: "Granada",
      url: `${site.url}/#salas`,
    },
    {
      name: "Estudio de podcast profesional",
      description:
        "Estudio de grabación de podcast con equipo profesional. Reserva por sesión o por bonos para series. Soporte técnico opcional.",
      areaServed: "Granada",
      url: `${site.url}/#podcast`,
    },
    {
      name: "Comunidad y eventos de innovación social",
      description:
        "El HUB acoge encuentros, talleres y comunidad alrededor de la innovación social. Eventos abiertos al público y privados para socios.",
      areaServed: "Granada",
      url: `${site.url}/#comunidad`,
    },
  ];

  return services.map((s) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    description: s.description,
    provider: { "@id": `${site.url}/#localbusiness` },
    areaServed: { "@type": "City", name: s.areaServed },
    url: s.url,
  }));
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
