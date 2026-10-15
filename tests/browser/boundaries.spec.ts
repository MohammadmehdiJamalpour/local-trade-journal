import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { acceptDialog, openJournal, snapshot } from "./helpers";
import AxeBuilder from "@axe-core/playwright";

test("multi-market CSV preserves exact inputs, Unicode and frozen initial risk", async ({
  page,
}) => {
  await openJournal(page, "trade-new", false);
  for (const [id, value] of Object.entries({
    symbol: "CSVFX",
    entry: "160",
    stop: "159",
    target: "162",
    quantity: "0.1",
  }))
    await page.locator("#" + id).fill(value);
  await page.locator(".economic-editor > summary").click();
  await page.locator("#instrument-unit").selectOption("lots");
  await page.locator("#instrument-multiplier").fill("100000");
  await page.locator("#instrument-currency").fill("JPY");
  await page.locator("#entry-fx-rate").fill(".006");
  await page.locator("#exit-fx-rate").fill(".0065");
  await page.getByRole("button", { name: "وضعیت", exact: true }).click();
  await page.getByRole("option", { name: "بسته", exact: true }).click();
  await page.locator("#exit").fill("161");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  const original = (await snapshot(page)).data.trades[0];
  await openJournal(page, "settings/data", false);
  const downloadEvent = page.waitForEvent("download");
  await page.locator("#export-csv").click();
  const csv = await readFile((await (await downloadEvent).path())!, "utf8");
  const rows = await page.evaluate((text) => EdgeJournal.parseCSV(text), csv);
  rows[1][0] = "csv-imported";
  const text = rows
    .map((row) =>
      row.map((value) => '"' + value.replace(/"/g, '""') + '"').join(","),
    )
    .join("\r\n");
  await page.locator("#csv-file").setInputFiles({
    name: "roundtrip.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text),
  });
  await acceptDialog(page);
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(2);
  const restored = (await snapshot(page)).data.trades.find(
    (trade) => trade.id === "csv-imported",
  )!;
  for (const field of [
    "instrument",
    "initialPlan",
    "fills",
    "entry",
    "quantity",
    "entryFxRate",
    "exitFxRate",
    "netPnl",
  ])
    expect(restored[field]).toEqual(original[field]);
});

test("file startup and disconnected routes need no network resources", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Direct-file support is primary on Windows Chromium/Edge.",
  );
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await context.setOffline(true);
  await page.goto(
    pathToFileURL(resolve("dist/index.html")).href + "?demo=1#dashboard",
  );
  await page.waitForFunction(
    () => document.documentElement.dataset.journalReady === "true",
  );
  for (const route of [
    "trades",
    "charts",
    "accounts",
    "settings/data",
    "trade-new",
  ]) {
    await page.evaluate((value) => {
      location.hash = value;
    }, route);
    await expect(page.locator(".app-page:not([hidden])")).toHaveCount(1);
  }
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect((await snapshot(page)).data.trades).toHaveLength(100);
});

test("all principal screens meet automated AA checks and fit the layout matrix", async ({
  page,
}) => {
  test.setTimeout(120000);
  const routes = [
    "dashboard",
    "trades",
    "trade-new",
    "analytics",
    "charts",
    "accounts",
    "settings/data",
    "catalogs",
  ];
  for (const route of routes) {
    await openJournal(page, route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((item) => ({
        id: item.id,
        impact: item.impact,
        nodes: item.nodes.map((node) => node.target),
      })),
      route,
    ).toEqual([]);
  }
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["trades", "trade-new", "charts", "accounts"]) {
      await openJournal(page, route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route + ":" + width,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await openJournal(page, "trade-new");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("password dialogs trap keyboard focus, cancel with Escape, and restore focus", async ({
  page,
}) => {
  await openJournal(page, "settings/data");
  const trigger = page.getByRole("button", {
    name: "پشتیبان رمزدار",
    exact: true,
  });
  await trigger.click();
  await expect(page.locator("#edge-backup-password")).toBeFocused();
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest(".edge-dialog")),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(".edge-dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("unavailable storage is persistently read-only and never claims a save", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "indexedDB", { value: undefined });
  });
  await openJournal(page, "settings", false);
  await expect(page.locator(".recovery-panel")).toBeVisible();
  await expect(page.locator("#durable-save-status")).toContainText(
    "فقط خواندنی",
  );
  await page.locator("#currency").fill("EUR");
  await page.locator("#save-general-settings").click();
  await expect(page.locator("#durable-save-status")).not.toContainText(
    "ذخیره شد",
  );
});

test("Persian dates, digits and historic arithmetic baseline remain usable", async ({
  page,
}) => {
  await openJournal(page);
  const result = await page.evaluate(() => ({
    date: EdgeJournal.parsePersianDate("۱۴۰۴/۰۱/۰۱"),
    formatted: EdgeJournal.formatPersianDateInput("2025-03-21"),
    number: EdgeJournal.parseLocalizedNumber("۱٬۲۳۴٫۵"),
    invalid: EdgeJournal.parsePersianDate("۱۴۰۴/۱۳/۳۲"),
  }));
  expect(result.date).toBe("2025-03-21");
  expect(result.formatted).toContain("۱۴۰۴");
  expect(result.number).toBe(1234.5);
  expect(result.invalid).toBeNull();
});

test("rejects incomplete or currency-inconsistent modern JSON without changing the journal", async ({
  page,
}) => {
  await openJournal(page, "settings/data");
  const before = await snapshot(page);
  expect(before.data.version).toBe(13);
  expect(before.data.trades.length).toBeGreaterThan(0);
  const missingAccounts = structuredClone(before.data) as Partial<
    typeof before.data
  >;
  delete missingAccounts.accounts;
  const missingCurrency = structuredClone(before.data);
  delete (
    missingCurrency.accounts[0] as Partial<
      (typeof missingCurrency.accounts)[number]
    >
  ).currency;
  const mismatchedCurrency = structuredClone(before.data);
  const originalTrade = mismatchedCurrency.trades[0];
  originalTrade.accountCurrency =
    originalTrade.accountCurrency === "EUR" ? "GBP" : "EUR";

  for (const [name, payload] of [
    ["missing-accounts", missingAccounts],
    ["missing-currency", missingCurrency],
    ["mismatched-currency", mismatchedCurrency],
  ] as const) {
    await page.locator("#json-file").setInputFiles({
      name: name + ".json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(payload)),
    });
    await expect(page.locator("#json-file")).toHaveValue("");
    await expect(page.locator(".edge-dialog[open]")).toHaveCount(0);
    await expect(page.locator("#toast-region")).toContainText("ناموفق");
    const after = await snapshot(page);
    expect(after.revision, name).toBe(before.revision);
    expect(after.data, name).toEqual(before.data);
  }
});

test("previews an R shortcut as an explicit forex fill before saving it", async ({
  page,
}) => {
  await openJournal(page, "trade-new", false);
  for (const [id, value] of Object.entries({
    symbol: "RSHORTCUTJPY",
    entry: "160",
    stop: "159",
    target: "162",
    quantity: "0.1",
  }))
    await page.locator("#" + id).fill(value);
  await page.locator(".economic-editor > summary").click();
  await page.locator("#instrument-unit").selectOption("lots");
  await page.locator("#instrument-multiplier").fill("100000");
  await page.locator("#instrument-currency").fill("JPY");
  await page.locator("#entry-fx-rate").fill("0.006");
  await page.locator("#exit-fx-rate").fill("0.012");
  await page.locator("#shortcut-r").fill("2");
  await page.locator("#shortcut-quantity").fill("0.1");
  const before = await snapshot(page);
  await page.locator("#preview-r-exit").click();
  await expect(page.locator(".edge-dialog")).toContainText("قیمت خروج: 161");
  await expect(page.locator(".edge-dialog")).toContainText("حجم: 0.1");
  await expect(page.locator(".edge-dialog")).toContainText("تبدیل سود: 0.012");
  expect((await snapshot(page)).revision).toBe(before.revision);
  await acceptDialog(page);
  await expect(page.locator('.fill-editor input[id$="-price"]')).toHaveValue(
    "161",
  );
  expect((await snapshot(page)).data.trades).toHaveLength(0);
  await page.getByRole("button", { name: "وضعیت", exact: true }).click();
  await page.getByRole("option", { name: "بسته", exact: true }).click();
  await expect(page.locator("#exit")).toBeDisabled();
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  const trade = (await snapshot(page)).data.trades[0];
  expect(trade.initialPlan.risk).toBe("60");
  expect(trade.netPnl).toBe("120");
  expect(trade.realizedR).toBe("2");
  expect(trade.fills[0]).toMatchObject({
    price: "161",
    quantity: "0.1",
    fxRate: "0.012",
  });
  expect(trade.fills[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(trade.fills[0].time).toMatch(/^\d{2}:\d{2}$/);
});
