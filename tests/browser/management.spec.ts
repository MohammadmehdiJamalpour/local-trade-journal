import { test, expect, type Page } from "@playwright/test";
import { acceptDialog, openJournal, snapshot } from "./helpers";

async function createTrade(page: Page, symbol: string, planned = false) {
  await openJournal(page, "trade-new", false);
  await page.locator("#symbol").fill(symbol);
  await page.locator("#entry").fill("100");
  await page.locator("#stop").fill("90");
  await page.locator("#target").fill("120");
  await page.locator("#quantity").fill("10");
  if (planned) {
    await page.getByRole("button", { name: "وضعیت", exact: true }).click();
    await page
      .getByRole("option", { name: "برنامه‌ریزی‌شده", exact: true })
      .click();
  }
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  return (await snapshot(page)).data.trades[0].id;
}

test("uses the displayed original stop when correcting a managed execution", async ({
  page,
}) => {
  const id = await createTrade(page, "FROZEN");
  await openJournal(page, "trade-edit=" + id, false);
  await page.locator("#stop").fill("95");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades[0].stop)
    .toBe("95");
  expect((await snapshot(page)).data.trades[0].initialPlan.risk).toBe("100");

  await openJournal(page, "trade-edit=" + id, false);
  await page.locator("#quantity").fill("20");
  await page.locator(".economic-editor > summary").click();
  await expect(page.locator("#correction-stop")).toHaveValue("90");
  await expect(page.locator("#correction-target")).toHaveValue("120");
  await page.locator("#correction-reason").fill("تصحیح حجم اجرای اولیه");
  await page.locator("#save-trade").click();
  await acceptDialog(page);
  await expect
    .poll(async () => (await snapshot(page)).data.trades[0].quantity)
    .toBe("20");
  const corrected = (await snapshot(page)).data.trades[0];
  expect(corrected.stop).toBe("95");
  expect(corrected.initialPlan.stop).toBe("90");
  expect(corrected.initialPlan.target).toBe("120");
  expect(corrected.initialPlan.risk).toBe("200");
  expect(corrected.initialPlan.reward).toBe("400");
});

test("updates planned risk before execution and freezes it when execution begins", async ({
  page,
}) => {
  const id = await createTrade(page, "PLANNED", true);
  expect((await snapshot(page)).data.trades[0].initialPlan.risk).toBe("100");
  await openJournal(page, "trade-edit=" + id, false);
  await page.locator("#quantity").fill("20");
  await page.locator("#stop").fill("92");
  await page.locator("#target").fill("130");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades[0].quantity)
    .toBe("20");
  const planned = (await snapshot(page)).data.trades[0];
  expect(planned.status).toBe("planned");
  expect(planned.initialPlan.risk).toBe("160");
  expect(planned.initialPlan.reward).toBe("600");
  expect(planned.initialPlan.rr).toBe("3.75");

  await openJournal(page, "trade-edit=" + id, false);
  await page.locator("#stop").fill("90");
  await page.getByRole("button", { name: "وضعیت", exact: true }).click();
  await page.getByRole("option", { name: "باز", exact: true }).click();
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades[0].status)
    .toBe("open");
  expect((await snapshot(page)).data.trades[0].initialPlan.risk).toBe("200");

  await openJournal(page, "trade-edit=" + id, false);
  await page.locator("#stop").fill("105");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades[0].stop)
    .toBe("105");
  expect((await snapshot(page)).data.trades[0].initialPlan.risk).toBe("200");
});

test("retains an automatic snapshot before deleting a used catalog option", async ({
  page,
}) => {
  await openJournal(page, "catalogs/strategy");
  const before = await snapshot(page);
  const trade = before.data.trades.find(
    (item) => typeof item.strategy === "string" && item.strategy,
  )!;
  const strategy = trade.strategy as string;
  const option = before.data.options.strategy.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      item.id === strategy,
  ) as { id: string; label: string };
  expect(option).toBeDefined();
  await page
    .getByRole("button", { name: "حذف دائمی: " + option.label, exact: true })
    .click();
  await acceptDialog(page);
  await expect
    .poll(async () => (await snapshot(page)).revision)
    .toBeGreaterThan(before.revision);
  expect(
    (await snapshot(page)).data.trades.find((item) => item.id === trade.id)
      ?.strategy,
  ).not.toBe(strategy);

  await openJournal(page, "settings/data");
  await page
    .getByRole("button", { name: "بررسی فضا و نسخه‌های بازیابی", exact: true })
    .click();
  const restore = page.getByRole("button", {
    name: "بازگردانی این نسخه",
    exact: true,
  });
  await expect(restore).toHaveCount(1);
  await restore.click();
  const reloaded = page.waitForEvent(
    "framenavigated",
    (frame) => frame === page.mainFrame(),
  );
  await acceptDialog(page);
  await reloaded;
  await page.waitForFunction(
    () => document.documentElement.dataset.journalReady === "true",
  );
  await expect
    .poll(
      async () =>
        (await snapshot(page)).data.trades.find((item) => item.id === trade.id)
          ?.strategy,
    )
    .toBe(strategy);
  expect((await snapshot(page)).data.trades).toHaveLength(
    before.data.trades.length,
  );
});

test("saves an account's edited EUR currency and protects it after execution", async ({
  page,
}) => {
  await openJournal(page, "accounts", false);
  await expect(page.locator("#account-editor-currency")).toHaveCount(1);
  await page.locator("#account-editor-name").fill("Euro account");
  await page.locator("#account-editor-currency").fill("GBP");
  await page.locator("#account-editor-save").click();
  await expect
    .poll(async () => (await snapshot(page)).data.accounts.length)
    .toBe(2);
  const id = (await snapshot(page)).data.accounts.find(
    (account) => account.name === "Euro account",
  )!.id;
  expect(
    (await snapshot(page)).data.accounts.find((account) => account.id === id)
      ?.currency,
  ).toBe("GBP");

  await page.reload();
  await page.locator("#account-editor-select").selectOption(id);
  await expect(page.locator("#account-editor-currency")).toHaveValue("GBP");
  await page.locator("#account-editor-currency").fill("EUR");
  await page.locator("#account-editor-balance").fill("2500");
  await page.locator("#account-editor-save").click();
  await expect
    .poll(
      async () =>
        (await snapshot(page)).data.accounts.find(
          (account) => account.id === id,
        )?.currency,
    )
    .toBe("EUR");
  expect(
    (await snapshot(page)).data.accounts.find((account) => account.id === id)
      ?.accountBalance,
  ).toBe("2500");

  await openJournal(page, "trade-new", false);
  await page.locator("#trade-account-button").click();
  await page.getByRole("option", { name: "Euro account", exact: true }).click();
  await page.locator("#symbol").fill("EURSTOCK");
  await page.locator("#entry").fill("100");
  await page.locator("#stop").fill("90");
  await page.locator("#target").fill("120");
  await page.locator("#quantity").fill("10");
  await page.locator(".economic-editor > summary").click();
  await page.locator("#instrument-unit").selectOption("contracts");
  await page.locator("#instrument-multiplier").fill("2");
  await expect(page.locator("#instrument-currency")).toHaveValue("EUR");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  const trade = (await snapshot(page)).data.trades[0];
  expect(trade.accountId).toBe(id);
  expect(trade.accountCurrency).toBe("EUR");
  expect(trade.instrument.quoteCurrency).toBe("EUR");
  expect(trade.instrument.multiplier).toBe("2");
  expect(trade.instrument.quantityUnit).toBe("contracts");
  await openJournal(page, "accounts", false);
  await page.locator("#account-editor-select").selectOption(id);
  await expect(page.locator("#account-editor-currency")).toHaveValue("EUR");
  await expect(page.locator("#account-editor-currency")).toBeDisabled();
});
