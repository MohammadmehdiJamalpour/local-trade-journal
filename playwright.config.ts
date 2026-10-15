import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 2,
  timeout: 30000,
  retries: 0,
  outputDir: "output/playwright",
  reporter: [
    ["list"],
    ["json", { outputFile: "output/playwright/results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:18850",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : {},
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ...(process.env.EDGE_JOURNAL_SYSTEM_BROWSERS === "1"
      ? [
          {
            name: "chrome",
            use: { ...devices["Desktop Chrome"], channel: "chrome" },
          },
          {
            name: "edge",
            use: { ...devices["Desktop Chrome"], channel: "msedge" },
          },
        ]
      : []),
  ],
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:18850",
    reuseExistingServer: !process.env.CI,
  },
});
