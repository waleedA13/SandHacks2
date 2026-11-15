import { defineConfig, devices } from "@playwright/test";
import { isLocalNeonHost } from "./lib/neon-local";

process.loadEnvFile(".env.test");
// loadEnvFile does not override a DATABASE_URL already set in the shell.
if (!isLocalNeonHost(process.env.DATABASE_URL ?? "http://unset"))
  throw new Error(
    "E2E tests only run against the local Docker database. Unset DATABASE_URL in this shell.",
  );

export default defineConfig({
  testDir: "e2e",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
