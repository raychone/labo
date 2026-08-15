import { defineConfig, devices } from "@playwright/test";

const webBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  globalTimeout: 20 * 60 * 1000,
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/smoke",
  timeout: 180_000,
  use: {
    baseURL: webBaseUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/playwright-web-server.mjs",
    reuseExistingServer: true,
    timeout: 180_000,
    url: webBaseUrl,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
