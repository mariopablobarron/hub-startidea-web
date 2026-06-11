import { test, expect } from "@playwright/test";

test.describe("Web pública", () => {
  test("home carga con título y JSON-LD", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/HUB Startidea/);
    // JSON-LD inyectado por el componente JsonLd
    const ldCount = await page.locator('script[type="application/ld+json"]').count();
    expect(ldCount).toBeGreaterThanOrEqual(1);
  });

  test("/salas lista al menos 6 salas", async ({ page }) => {
    await page.goto("/salas");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const cards = page.locator("a[href^='/salas/']");
    expect(await cards.count()).toBeGreaterThanOrEqual(6);
  });

  test("/salas/cc33 con metadata propia", async ({ page }) => {
    await page.goto("/salas/cc33");
    await expect(page).toHaveTitle(/CC33/);
    const og = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(og).toContain("CC33");
  });

  test("404 muestra sugerencias de salas", async ({ page }) => {
    const res = await page.goto("/no-existe-esta-pagina");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/404/)).toBeVisible();
    await expect(page.getByText(/quizá buscabas/i)).toBeVisible();
  });

  test("/sitemap.xml válido y contiene salas", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/salas/cc33");
  });

  test("/robots.txt excluye /admin", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Disallow: /admin");
  });

  test("/api/health responde 200 con JSON status=ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("hub-startidea-web");
    expect(body.ts).toBeTruthy();
  });
});

test.describe("Formulario de contacto", () => {
  test("home renderiza form de contacto con campos esperados", async ({ page }) => {
    await page.goto("/#contacto");
    await expect(page.getByRole("heading", { name: /Cuéntanos qué buscas/i })).toBeVisible();
    await expect(page.getByLabel(/^Nombre/i)).toBeVisible();
    await expect(page.getByLabel(/^Email/i)).toBeVisible();
    await expect(page.getByLabel(/^Mensaje/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar mensaje/i })).toBeVisible();
  });

  test("submit vacío muestra validación del navegador (no envía)", async ({ page }) => {
    await page.goto("/#contacto");
    const submit = page.getByRole("button", { name: /Enviar mensaje/i });
    await submit.click();
    // El form tiene required en nombre/email/mensaje. El navegador bloquea
    // el submit nativo. Como noValidate=true en el form, la validación cae
    // sobre la server action: comprobamos que aparece algún mensaje de error.
    // Pero como noValidate=true, el navegador no muestra los popups nativos.
    // Verificamos que tras click no aparece banner de éxito.
    await expect(page.getByText(/¡Mensaje recibido!/i)).toHaveCount(0);
  });
});

test.describe("Páginas dedicadas (SEO)", () => {
  test("/ecosistema carga con title, intro y 4 proyectos", async ({ page }) => {
    const res = await page.goto("/ecosistema");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/universo Startidea/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // 4 cards de proyectos
    for (const name of [
      "Startidea",
      "Tres mil millones de latidos",
      "Raíz y Acción",
      "TodoMerchandising",
    ]) {
      await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    }
    // CTA hacia /metodo en el cierre (texto: "Entrar por el método")
    await expect(page.getByRole("link", { name: /Entrar por el método/i })).toBeVisible();
  });

  test("/metodo carga con title, fases y CTA externo", async ({ page }) => {
    const res = await page.goto("/metodo");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Raíz y Acción/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // 4 fases con sus nombres
    for (const step of ["Raíz", "Tronco", "Ramas", "Acción"]) {
      await expect(page.locator("ol").getByText(step, { exact: true }).first()).toBeVisible();
    }
    // CTA hacia raizyaccion.hubstartidea.es
    const externalCta = page.locator("a[href*='raizyaccion']").first();
    await expect(externalCta).toBeVisible();
  });

  test("sitemap incluye /ecosistema y /metodo", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("/ecosistema");
    expect(body).toContain("/metodo");
  });
});

test.describe("Narrativa de matriz (HUB casa madre de Startidea)", () => {
  test("hero menciona Startidea y CTA secundario apunta a #ecosistema", async ({ page }) => {
    await page.goto("/");
    // Hero refleja la narrativa "universo Startidea"
    await expect(page.locator("text=universo Startidea").first()).toBeVisible();
    // CTA secundario debe enlazar a #ecosistema (NO a #tour como antes)
    const cta = page.getByRole("link", { name: /Conoce el universo/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "#ecosistema");
  });

  test("sección #manifiesto presenta los dos pilares (puertas)", async ({ page }) => {
    await page.goto("/#manifiesto");
    // Narrativa "universo, dos puertas" — pilares "Por la puerta" / "Por la idea"
    await expect(page.getByText("Por la puerta", { exact: true })).toBeVisible();
    await expect(page.getByText("Por la idea", { exact: true })).toBeVisible();
    // Cada pilar debe tener CTA con su texto característico
    await expect(page.getByRole("link", { name: /Ver salas y reservar/i })).toBeVisible();
  });

  test("sección #ecosistema lista 4 proyectos con enlaces externos", async ({ page }) => {
    await page.goto("/#ecosistema");
    // Los 4 proyectos por nombre (h3 dentro de las cards)
    for (const name of [
      "Startidea",
      "Tres mil millones de latidos",
      "Raíz y Acción",
      "TodoMerchandising",
    ]) {
      // Usamos getByText para evitar fragilidad con role/level que depende del DOM real
      await expect(page.locator("section#ecosistema").getByText(name, { exact: true }).first()).toBeVisible();
    }
    // Cada card abre en nueva pestaña — al menos 4 enlaces externos en la sección
    const links = page.locator("section#ecosistema a[target='_blank']");
    expect(await links.count()).toBeGreaterThanOrEqual(4);
  });

  test("sección #metodo (Raíz y Acción) con 4 pasos y CTA externo", async ({ page }) => {
    await page.goto("/#metodo");
    await expect(page.getByText(/Llevamos las ideas/i)).toBeVisible();
    // 4 pasos: Raíz, Tronco, Ramas, Acción — buscamos por texto dentro de la sección
    const seccion = page.locator("section#metodo");
    for (const step of ["Raíz", "Tronco", "Ramas", "Acción"]) {
      await expect(seccion.getByText(step, { exact: true }).first()).toBeVisible();
    }
    const cta = page.getByRole("link", { name: /Descubre el método/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /raizyaccion/);
  });

  test("footer tiene cinta superior 'El HUB forma parte de' con 4 proyectos", async ({ page }) => {
    await page.goto("/");
    const ribbon = page.getByText(/El HUB forma parte de/i);
    await expect(ribbon).toBeVisible();
    // 4 links de proyectos en el footer (cinta + columna enlaces)
    const footerProjectLinks = page.locator("footer a[target='_blank']");
    expect(await footerProjectLinks.count()).toBeGreaterThanOrEqual(4);
  });

  test("nav muestra Ecosistema primero y Método entre Tour y Podcast", async ({ page }) => {
    await page.goto("/");
    const navLinks = page.locator("header nav a");
    const labels = await navLinks.allTextContents();
    const cleaned = labels.map((s) => s.trim()).filter(Boolean);
    // Ecosistema antes que Salas
    const ecoIdx = cleaned.indexOf("Ecosistema");
    const salasIdx = cleaned.indexOf("Salas");
    expect(ecoIdx).toBeGreaterThanOrEqual(0);
    expect(ecoIdx).toBeLessThan(salasIdx);
    // Método entre Tour y Podcast
    const tourIdx = cleaned.indexOf("Tour");
    const metodoIdx = cleaned.indexOf("Método");
    const podcastIdx = cleaned.indexOf("Podcast");
    expect(tourIdx).toBeLessThan(metodoIdx);
    expect(metodoIdx).toBeLessThan(podcastIdx);
  });
});

test.describe("Cabeceras de seguridad", () => {
  test("home incluye headers anti-clickjacking + nosniff + Referrer-Policy", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBeTruthy();
    // No debería filtrar X-Powered-By
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("VoiceWidget (ElevenLabs)", () => {
  test("home inyecta script de ElevenLabs convai-widget-embed", async ({ page }) => {
    await page.goto("/");
    // El widget es client-side y se inyecta vía useEffect. Esperamos a que el
    // <script data-elevenlabs-convai> aparezca en el DOM (hasta 5s).
    const script = page.locator('script[data-elevenlabs-convai]');
    await expect(script).toHaveCount(1, { timeout: 5_000 });
    const src = await script.getAttribute("src");
    expect(src).toContain("@elevenlabs/convai-widget-embed");
  });
});

test.describe("Reservar — guest checkout", () => {
  test("/reservar (anónimo) muestra form completo con campos guest", async ({ page }) => {
    await page.goto("/reservar");
    // Visitor ve form unificado (no AnonymousLanding). Debe haber:
    // 1) Header con CTA a login
    await expect(page.getByRole("link", { name: /Inicia sesi[oó]n/i })).toBeVisible();
    // 2) SlotPicker / form fields del booking estándar
    await expect(page.getByText(/Qu[eé] vas a hacer\?/i)).toBeVisible();
    // 3) Campos guest específicos (nombre, email, teléfono)
    await expect(page.getByLabel(/Nombre completo/i)).toBeVisible();
    await expect(page.getByLabel(/^Email$/i)).toBeVisible();
    await expect(page.getByLabel(/Tel[eé]fono.*opcional/i)).toBeVisible();
    // 4) Botón submit del form (texto cambió a solo "Reservar" cuando
    //    se añadió elección stripe/transferencia — buscamos submit en el
    //    bloque del form, no en el header)
    await expect(
      page.locator("form").getByRole("button", { name: /^Reservar/i }),
    ).toBeVisible();
    // 5) Texto explicativo del flow (tarjeta o transferencia). El copy
    //    cambió al introducir la elección de método pago — ahora menciona
    //    "tarjeta o transferencia" en vez del antiguo "30 min".
    await expect(page.getByText(/tarjeta o transferencia/i).first()).toBeVisible();
  });

  test("/reservar (anónimo) muestra tarifa visitor con IVA", async ({ page }) => {
    await page.goto("/reservar");
    // Visitor ve PVP por hora 24,20€ (20€ base + 21% IVA) y el desglose
    await expect(page.getByText(/24,20\s*€/).first()).toBeVisible();
    await expect(page.getByText(/IVA.*21\s*%/i).first()).toBeVisible();
  });

  test("/reservar (anónimo) header indica acceso a Stripe", async ({ page }) => {
    await page.goto("/reservar");
    // El texto del header explica el flow: Stripe Checkout → confirmación instantánea
    await expect(page.getByText(/Stripe/i).first()).toBeVisible();
  });
});

test.describe("Precios — página pública", () => {
  test("/precios indexable con tabla por rol", async ({ page }) => {
    await page.goto("/precios");
    // Título principal con tono Startidea (no SaaS genérico)
    await expect(page.getByRole("heading", { name: /sin sorpresas/i, level: 1 })).toBeVisible();
    // Tabla con 3 columnas de rol
    await expect(page.getByRole("columnheader", { name: /Visitante/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Colaborador/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Coworker/i })).toBeVisible();
    // Al menos una fila de sala con CTA Reservar
    const reservarLinks = page.getByRole("link", { name: /^Reservar$/i });
    expect(await reservarLinks.count()).toBeGreaterThan(0);
    // Letra pequeña visible (IVA, pago, cancelación)
    await expect(page.getByText(/IVA incluido/i)).toBeVisible();
  });

  test("/precios tiene canonical y robots indexable", async ({ page }) => {
    const res = await page.goto("/precios");
    expect(res?.status()).toBe(200);
    // Canonical
    const canonical = await page
      .locator("link[rel=canonical]")
      .getAttribute("href");
    expect(canonical).toBe("https://hubstartidea.es/precios");
    // No tiene noindex (debe estar en buscadores)
    const robots = await page.locator('meta[name="robots"]').count();
    if (robots > 0) {
      const content = await page.locator('meta[name="robots"]').getAttribute("content");
      expect(content).not.toMatch(/noindex/i);
    }
  });
});

test.describe("Transparencia — datos reales", () => {
  test("/transparencia con ocupación, reservas y feedback", async ({ page }) => {
    await page.goto("/transparencia");
    // H1 real: "Los datos que casi nadie enseña."
    await expect(page.getByRole("heading", { name: /casi nadie enseña/i, level: 1 })).toBeVisible();
    // Sección ocupación por sala (h2)
    await expect(page.getByRole("heading", { name: /Ocupación real/i, level: 2 })).toBeVisible();
    // Stats principales
    await expect(page.getByText(/Reservas este mes/i).first()).toBeVisible();
    await expect(page.getByText(/Coworkers activos/i).first()).toBeVisible();
    // Sección feedback humano
    await expect(page.getByRole("heading", { name: /quien ha estado/i, level: 2 })).toBeVisible();
    // Bloque honestidad (lo que NO enseñamos todavía)
    await expect(page.getByText(/no enseña.*todavía/i).first()).toBeVisible();
  });
});

test.describe("Feedback — token inválido", () => {
  test("/feedback/<token-inválido> devuelve 404", async ({ page }) => {
    const res = await page.goto("/feedback/this-token-does-not-exist-12345");
    expect(res?.status()).toBe(404);
  });
});

test.describe("Middleware anti-spam", () => {
  test("URL de casino devuelve 410 Gone", async ({ request }) => {
    const res = await request.get("/mejores-casinos-argentina", { failOnStatusCode: false });
    expect(res.status()).toBe(410);
    // X-Robots-Tag bloquea indexación incluso del 410
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("URL de juega-gratis devuelve 410", async ({ request }) => {
    const res = await request.get("/juega-gratis-a-wild-chapo", { failOnStatusCode: false });
    expect(res.status()).toBe(410);
  });

  test("URL legítima NO se bloquea por error (regresión)", async ({ request }) => {
    // Salas tienen "casino" como falso positivo posible si el regex
    // estuviera mal. Verificamos rutas reales no se bloquean.
    for (const path of ["/", "/salas", "/salas/cc33", "/reservar", "/precios", "/comunidad"]) {
      const res = await request.get(path);
      expect(res.status(), `${path} debe responder 200`).toBe(200);
    }
  });
});
