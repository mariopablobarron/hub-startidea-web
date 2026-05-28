import { test, expect } from "@playwright/test";

const E2E_DISABLED = !process.env.ADMIN_TEST_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || "mario@startidea.es";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || "";

test.describe("Admin (requiere ADMIN_TEST_PASSWORD)", () => {
  test.skip(E2E_DISABLED, "ADMIN_TEST_PASSWORD no definida — saltando tests admin");

  test("/admin redirige a login si no hay sesión", async ({ page }) => {
    const res = await page.goto("/admin");
    expect(page.url()).toContain("/admin/login");
    expect(res?.status()).toBe(200);
  });

  test("login con credenciales correctas → dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/admin$|\/admin\?/);
    await expect(page.getByRole("heading", { name: /panel de administraci[oó]n/i })).toBeVisible();
  });

  test("login con credenciales incorrectas muestra error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill("password-incorrecta-fake-12345");
    await page.getByRole("button", { name: /entrar/i }).click();
    // El servidor redirige con ?error y la UI muestra mensaje
    await expect(page.getByText(/incorrectos/i)).toBeVisible();
  });

  test("sidebar marca la sección activa con aria-current", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/admin$|\/admin\?/);

    await page.goto("/admin/hero");
    const heroLink = page.locator('a[href="/admin/hero"][aria-current="page"]');
    await expect(heroLink).toBeVisible();
  });

  test("/admin/agenda renderiza grid y slots libres llevan a /reservar pre-rellenado", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/admin($|\?)/);

    // Navegamos a la agenda de pasado mañana para asegurar slots libres
    // (no afectado por bookings reales de hoy/mañana).
    const future = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    await page.goto(`/admin/agenda?fecha=${future}`);

    // Navegación día anterior / siguiente accesible
    await expect(page.getByLabel("Día anterior")).toBeVisible();
    await expect(page.getByLabel("Día siguiente")).toBeVisible();

    // Al menos un slot libre con link a /reservar pre-rellenado
    const reservarLinks = page.locator(`a[href^="/reservar?sala="][href*="fecha=${future}"]`);
    expect(await reservarLinks.count()).toBeGreaterThan(0);

    // El primero apunta correctamente con sala + fecha + hora
    const href = await reservarLinks.first().getAttribute("href");
    expect(href).toMatch(/^\/reservar\?sala=[^&]+&fecha=\d{4}-\d{2}-\d{2}&hora=\d{1,2}$/);
  });
});
