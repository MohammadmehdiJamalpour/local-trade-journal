import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { acceptDialog, openJournal, snapshot } from "./helpers";

test("all original routes retain desktop/mobile layouts without errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const routes = [
    "dashboard",
    "trades",
    "analytics",
    "analytics/factors",
    "analytics/time",
    "analytics/behavior",
    "analytics/reached-r",
    "analytics/table",
    "charts",
    "scenarios",
    "accounts",
    "settings",
    "settings/data",
    "catalogs",
    "trade-new",
    "trade=test-position-001",
  ];
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await openJournal(page, route);
      await expect(page.locator(".app-page:not([hidden])")).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test("creates, reopens, and edits a trade without changing initial risk", async ({
  page,
}) => {
  await openJournal(page, "trade-new", false);
  await page.locator("#symbol").fill("REVIEW");
  await page.locator("#entry").fill("100");
  await page.locator("#stop").fill("90");
  await page.locator("#target").fill("120");
  await page.locator("#quantity").fill("10");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  const trade = (await snapshot(page)).data.trades[0];
  expect(trade.plannedRisk).toBe("100");
  expect(trade.entry).toBe("100");
  await openJournal(page, "trade-edit=" + trade.id, false);
  await page.locator("#stop").fill("105");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades[0].stop)
    .toBe("105");
  expect((await snapshot(page)).data.trades[0].plannedRisk).toBe("100");
  await page.reload();
  await page.waitForFunction(() => typeof EdgeJournal !== "undefined");
  expect((await snapshot(page)).data.trades[0].stop).toBe("105");
});

test("malformed legacy data stays unchanged after a settings save", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("edge-journal:v3", "{broken-original"),
  );
  await openJournal(page, "settings", false);
  await expect(page.locator(".recovery-panel")).toBeVisible();
  await page.locator("#save-general-settings").click();
  await expect(page.locator("#durable-save-status")).toContainText("بازیابی");
  expect(
    await page.evaluate(() => localStorage.getItem("edge-journal:v3")),
  ).toBe("{broken-original");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.includes("before-")),
    ),
  ).toEqual([]);
});

test("partial legacy recovery does not silently replace rejected records", async ({
  page,
}) => {
  const fixture = JSON.parse(await readFile("src/data/demo.json", "utf8"));
  fixture.trades = [fixture.trades[0], { ...fixture.trades[1], quantity: 0 }];
  fixture.version = 11;
  const raw = JSON.stringify(fixture);
  await page.addInitScript(
    (value) => localStorage.setItem("edge-journal:v3", value),
    raw,
  );
  await openJournal(page, "settings", false);
  await expect(page.locator(".recovery-panel")).toContainText("1");
  await page.locator("#save-general-settings").click();
  expect(
    await page.evaluate(() => localStorage.getItem("edge-journal:v3")),
  ).toBe(raw);
});

test("migrates 1000 legacy trades without localStorage backup amplification", async ({
  page,
}) => {
  const fixture = JSON.parse(await readFile("src/data/demo.json", "utf8"));
  const source = fixture.trades;
  fixture.trades = Array.from({ length: 1000 }, (_, index) => ({
    ...source[index % 100],
    id: "legacy-" + index,
  }));
  fixture.version = 7;
  await page.addInitScript(
    (value) => localStorage.setItem("edge-journal:v3", value),
    JSON.stringify(fixture),
  );
  await openJournal(page, "settings", false);
  await expect(page.locator(".migration-panel")).toBeVisible();
  await page.locator(".migration-panel input[type=checkbox]").check();
  await Promise.all([
    page.waitForEvent("domcontentloaded"),
    page.getByRole("button", { name: "ارتقا و ادامه", exact: true }).click(),
  ]);
  await page.waitForFunction(
    () =>
      typeof EdgeJournal !== "undefined" &&
      document.documentElement.dataset.journalReady === "true" &&
      !document.querySelector(".migration-panel") &&
      EdgeJournal.getStatus().status === "ready",
  );
  expect((await snapshot(page)).data.trades).toHaveLength(1000);
  await page.locator("#save-general-settings").click();
  await expect(page.locator("#durable-save-status")).toContainText("ذخیره شد");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key.includes("before-")),
    ),
  ).toEqual([]);
});

test("exports and restores records and keeps demo/main separate", async ({
  page,
}) => {
  await openJournal(page, "settings/data");
  const downloadEvent = page.waitForEvent("download");
  await page.locator("#export-json").click();
  const download = await downloadEvent;
  const path = await download.path();
  const backup = JSON.parse(await readFile(path!, "utf8"));
  expect(backup.version).toBe(13);
  expect(backup.trades).toHaveLength(100);
  await openJournal(page, "settings/data", false);
  expect((await snapshot(page)).data.trades).toHaveLength(0);
  await page.locator("#json-file").setInputFiles(path!);
  await acceptDialog(page);
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(100);
});

test("search handles input quickly and only renders the active report", async ({
  page,
}) => {
  await openJournal(page, "trades");
  const duration = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("#filter-symbol")!;
    input.value = "BTC";
    const start = performance.now();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return performance.now() - start;
  });
  expect(duration).toBeLessThan(16);
  await expect(page.locator("#trade-rows")).toContainText("BTC");
});

test("dashboard has no serious or critical automated accessibility failures", async ({
  page,
}) => {
  await openJournal(page);
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    audit.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);
});
