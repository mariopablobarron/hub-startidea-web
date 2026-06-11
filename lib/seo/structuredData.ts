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
/**
 * Service schema enriquecido por sala. Incluye:
 *  - Offer con precio (si bookable + tarifa configurada) → Google Rich
 *    Results "From X EUR" en SERP.
 *  - additionalProperty con m² y capacidades por configuración →
 *    Google entiende que es un espacio físico con dimensiones.
 *  - image: usa la foto principal de la sala (room.image).
 *
 * Si la sala no tiene tarifa en faq.tariffs.rooms[slug], se omite el
 * Offer (no inventar precio en SEO).
 */
export function roomServiceSchema(room: Room) {
  // Lazy import del faq para no romper si la estructura cambia
  // (faqShape ya está tipado, así que esto compila tranquilo).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { faq } = require("@/lib/chat/faqShape") as typeof import("@/lib/chat/faqShape");
  const tariff = faq.tariffs.rooms[room.slug];
  const baseHour = tariff && "perHour" in tariff && tariff.perHour ? tariff.perHour : null;
  const vat = (faq.tariffs as { vatRate?: number }).vatRate ?? 21;
  const totalHour = baseHour ? Math.round(baseHour * (1 + vat / 100) * 100) / 100 : null;

  // additionalProperty estándar Schema.org para metadata estructurada
  const additionalProperty: Array<Record<string, unknown>> = [
    { "@type": "PropertyValue", name: "Superficie", value: room.area, unitCode: "MTK" /* m² */ },
  ];
  if (room.capacity.school > 0)
    additionalProperty.push({ "@type": "PropertyValue", name: "Capacidad escolar", value: room.capacity.school });
  if (room.capacity.theater > 0)
    additionalProperty.push({ "@type": "PropertyValue", name: "Capacidad auditorio", value: room.capacity.theater });
  if (room.capacity.boardroom)
    additionalProperty.push({ "@type": "PropertyValue", name: "Capacidad boardroom", value: room.capacity.boardroom });

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${site.url}/salas/${room.slug}#service`,
    name: `${room.name} · ${site.name}`,
    description: room.description,
    image: `${site.url}${room.image}`,
    provider: { "@id": `${site.url}/#localbusiness` },
    serviceType: room.subtitle,
    category: "Coworking · Sala de reuniones · Espacio para eventos",
    areaServed: { "@type": "City", name: "Granada" },
    url: `${site.url}/salas/${room.slug}`,
    additionalProperty,
  };

  // Offer solo si la sala es reservable Y tiene tarifa configurada
  if (room.bookable !== false && totalHour !== null) {
    schema.offers = {
      "@type": "Offer",
      url: `${site.url}/reservar?sala=${room.slug}`,
      priceCurrency: "EUR",
      price: totalHour,
      availability: "https://schema.org/InStock",
      validFrom: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: totalHour,
        priceCurrency: "EUR",
        unitCode: "HUR",
        unitText: "hora",
        valueAddedTaxIncluded: true,
      },
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        unitCode: "HUR",
        minValue: 1,
        maxValue: 8,
      },
    };
  }

  return schema;
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
      q: "¿Qué es el universo Startidea?",
      a: `Startidea es una agencia de innovación social con sede en Granada que diseña, lanza y acompaña proyectos con propósito. El "universo Startidea" es el conjunto de espacios físicos (el HUB en C/ Conde Cifuentes 33) y proyectos vivos cocinados desde aquí: ${(projects.length ? projects.map((p) => p.name).join(", ") : "Startidea, Tres mil millones de latidos, Raíz y Acción y TodoMerchandising")}.`,
    },
    {
      q: "¿Dónde está el HUB Startidea?",
      a: `En el centro de Granada, en ${site.address.street}, ${site.address.postal} ${site.address.city}. Bien comunicado con metro y autobús (paradas de Recogidas y Camino de Ronda) y con parking cercano (Granados / Ronda Centro).`,
    },
    {
      q: "¿Qué se puede hacer en el HUB Startidea?",
      a: "Dos cosas: entrar por la puerta (alquilar una sala para una formación, evento o reunión; grabar en el estudio de podcast; trabajar desde el coworking) o entrar por una idea (sumarte a alguno de los proyectos del universo Startidea como cliente, colaborador o socio).",
    },
    {
      q: "¿Quién está detrás del HUB?",
      a: `${site.parent.name}, una agencia de innovación social con más de una década acompañando proyectos con propósito. El HUB es donde el universo Startidea se hace tangible y donde se cocinan los proyectos: Tres mil millones de latidos, Raíz y Acción y TodoMerchandising.`,
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
      q: "¿Qué proyectos forman parte del universo Startidea?",
      a: `Hoy son cuatro: ${projects.map((p) => p.name).join(", ")}. Cada uno con su propia identidad y su propia voz. Todos se cocinan desde el HUB y comparten un mismo principio: ideas con propósito que se llevan a la acción.`,
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
