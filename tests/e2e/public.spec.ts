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
