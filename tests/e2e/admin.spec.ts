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
});
