import { defineConfig, devices } from "@playwright/test";

/**
 * Tests E2E con dos modos:
 * - LOCAL (default): contra http://localhost:3000 (necesita pnpm dev en otra terminal o webServer auto).
 * - PROD: con BASE_URL=https://hubstartidea.es pnpm test:e2e — corre solo lo que es seguro en prod.
 */
const baseURL = process.env.BASE_URL || "http://localhost:3000";
const isProd = baseURL.startsWith("https://");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: isProd ? 2 : 0,
  workers: isProd ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-ES",
    viewport: { width: 1280, height: 800 },
  },
  // En modo local, arranca pnpm dev automáticamente.
  webServer: isProd
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
