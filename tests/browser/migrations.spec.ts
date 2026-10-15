import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { openJournal, snapshot } from "./helpers";

for (let version = 1; version <= 12; version++)
  test(
    "accepts legacy document " +
      version +
      " with omissions and unchanged economics",
    async ({ page }) => {
      test.setTimeout(60000);
      const fixture = JSON.parse(await readFile("src/data/demo.json", "utf8"));
      const trade = {
        ...fixture.trades[0],
        id: "historic-" + version,
        status: "closed",
        direction: "long",
        entry: 100,
        stop: 90,
        target: 120,
        quantity: 10,
        exit: 120,
        fees: 10,
        plannedRisk: 100,
        plannedReward: 200,
        plannedRR: 2,
        grossPnl: 200,
        netPnl: 190,
        realizedR: 1.9,
        outcome: "win",
        partialExits: [],
        images: [],
      };
      fixture.version = version;
      fixture.trades = [trade];
      if (version <= 2) {
        delete fixture.accounts;
        delete fixture.settings.weekendDays;
        fixture.settings.weekendMode = "iran";
      }
      if (version < 8) {
        delete trade.maxUnrealizedProfit;
        delete trade.maxUnrealizedLoss;
      }
      if (version < 10) delete trade.timeframeDirections;
      if (version < 11) delete trade.confirmationValues;
      const raw = JSON.stringify(fixture);
      await page.addInitScript(
        (value) => localStorage.setItem("edge-journal:v3", value),
        raw,
      );
      await openJournal(page, "settings/data", false);
      await expect(page.locator(".migration-panel")).toBeVisible();
      expect(
        await page.evaluate(() => localStorage.getItem("edge-journal:v3")),
      ).toBe(raw);
      await page.locator(".migration-panel input[type=checkbox]").check();
      await Promise.all([
        page.waitForEvent("domcontentloaded"),
        page
          .getByRole("button", { name: "ارتقا و ادامه", exact: true })
          .click(),
      ]);
      await page.waitForFunction(
        () =>
          document.documentElement.dataset.journalReady === "true" &&
          !document.querySelector(".migration-panel"),
      );
      const migrated = (await snapshot(page)).data.trades[0];
      expect(migrated).toMatchObject({
        id: trade.id,
        accountId: trade.accountId || "account-main",
        netPnl: "190",
        plannedRisk: "100",
        realizedR: "1.9",
        initialPlan: { source: "legacy-assumption", stop: null, target: null },
        instrument: { multiplier: "1" },
        entryFxRate: "1",
      });
      expect((await snapshot(page)).data.version).toBe(13);
      expect(
        await page.evaluate(() => localStorage.getItem("edge-journal:v3")),
      ).toBe(raw);
    },
  );

test("marks a legacy execution without saved initial risk as an explicit assumption", async ({
  page,
}) => {
  const fixture = JSON.parse(await readFile("src/data/demo.json", "utf8"));
  const trade = {
    ...fixture.trades[0],
    id: "historic-missing-risk",
    status: "closed",
    direction: "long",
    entry: 100,
    stop: 90,
    target: 120,
    quantity: 10,
    exit: 120,
    fees: 10,
    partialExits: [],
    images: [],
  };
  for (const field of [
    "plannedRisk",
    "plannedReward",
    "plannedRR",
    "initialPlan",
  ])
    delete trade[field];
  fixture.version = 1;
  fixture.trades = [trade];
  delete fixture.accounts;
  delete fixture.settings.weekendDays;
  fixture.settings.weekendMode = "iran";
  const raw = JSON.stringify(fixture);
  await page.addInitScript(
    (value) => localStorage.setItem("edge-journal:v3", value),
    raw,
  );
  await openJournal(page, "settings/data", false);
  await expect(page.locator(".migration-panel")).toBeVisible();
  await page.locator(".migration-panel input[type=checkbox]").check();
  await Promise.all([
    page.waitForEvent("domcontentloaded"),
    page.getByRole("button", { name: "ارتقا و ادامه", exact: true }).click(),
  ]);
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.journalReady === "true" &&
      !document.querySelector(".migration-panel"),
  );
  const migrated = (await snapshot(page)).data.trades[0];
  expect(migrated.id).toBe("historic-missing-risk");
  expect(migrated.netPnl).toBe("190");
  expect(migrated.initialPlan).toMatchObject({
    risk: "100",
    source: "legacy-assumption",
    stop: null,
    target: null,
  });
  expect(
    await page.evaluate(() => localStorage.getItem("edge-journal:v3")),
  ).toBe(raw);
});
