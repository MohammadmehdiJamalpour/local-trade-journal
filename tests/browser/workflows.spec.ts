import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { acceptDialog, openJournal, snapshot } from "./helpers";

async function newTrade(page: Page, symbol = "FLOW") {
  await openJournal(page, "trade-new", false);
  await page.locator("#symbol").fill(symbol);
  await page.locator("#entry").fill("100");
  await page.locator("#stop").fill("90");
  await page.locator("#target").fill("120");
  await page.locator("#quantity").fill("10");
}
async function assetCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("edge-journal");
        request.onsuccess = () => {
          const db = request.result,
            count = db.transaction("assets").objectStore("assets").count();
          count.onsuccess = () => {
            resolve(count.result);
            db.close();
          };
          count.onerror = () => reject(count.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
}
async function testImage(page: Page) {
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 4;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#2199aa";
    context.fillRect(0, 0, 4, 4);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return {
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  };
}

test("calculates a forex lot with manual currency conversions", async ({
  page,
}) => {
  await newTrade(page, "EURJPY");
  await page.locator("#entry").fill("160");
  await page.locator("#stop").fill("159");
  await page.locator("#target").fill("162");
  await page.locator("#quantity").fill("0.1");
  await page.locator(".economic-editor > summary").click();
  await page.locator("#instrument-unit").selectOption("lots");
  await page.locator("#instrument-multiplier").fill("100000");
  await page.locator("#instrument-currency").fill("JPY");
  await page.locator("#entry-fx-rate").fill("0.006");
  await page.locator("#exit-fx-rate").fill("0.0065");
  await page.getByRole("button", { name: "وضعیت", exact: true }).click();
  await page.getByRole("option", { name: "بسته", exact: true }).click();
  await page.locator("#exit").fill("161");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  const trade = (await snapshot(page)).data.trades[0];
  expect(trade.plannedRisk).toBe("60");
  expect(trade.netPnl).toBe("65");
  expect(trade.instrument.quantityUnit).toBe("lots");
  await openJournal(page, "trade-edit=" + trade.id, false);
  if (
    (await page
      .locator("#accordion-result-trigger")
      .getAttribute("aria-expanded")) === "false"
  )
    await page.locator("#accordion-result-trigger").click();
  await page.locator("#exit").fill("159");
  await page.locator("#save-trade").click();
  await expect(page.locator("#durable-save-status")).toContainText(
    "دلیل اصلاح",
  );
  if (
    !(await page
      .locator(".economic-editor")
      .evaluate((node) => node.hasAttribute("open")))
  )
    await page.locator(".economic-editor > summary").click();
  await page.locator("#correction-reason").fill("تصحیح قیمت خروج اجراشده");
  await page.locator("#save-trade").click();
  await acceptDialog(page);
  await expect
    .poll(async () => (await snapshot(page)).data.trades[0].netPnl)
    .toBe("-65");
  expect((await snapshot(page)).data.trades[0].plannedRisk).toBe("60");
  await openJournal(page, "dashboard", false);
  await expect(page.locator("#metric-winrate")).toContainText("۰");
});

test("accepts complete executed fills without a redundant final exit", async ({
  page,
}) => {
  await newTrade(page);
  await page.locator(".economic-editor > summary").click();
  await page
    .getByRole("button", { name: "افزودن خروج با قیمت", exact: true })
    .click();
  await page.locator('.fill-editor input[id$="-price"]').fill("120");
  await page
    .locator('.fill-editor input[id^="fill-"][id$="-quantity"]')
    .fill("10");
  await page.getByRole("button", { name: "وضعیت", exact: true }).click();
  await page.getByRole("option", { name: "بسته", exact: true }).click();
  await expect(page.locator("#exit")).toBeDisabled();
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  const trade = (await snapshot(page)).data.trades[0];
  expect(trade.netPnl).toBe("200");
  expect(trade.fills).toHaveLength(1);
  expect(trade.exit).toBeNull();
});

test("requires an audited correction and preserves the event through backup restoration", async ({
  page,
}) => {
  await newTrade(page);
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  const id = (await snapshot(page)).data.trades[0].id;
  await openJournal(page, "trade-edit=" + id, false);
  await page.locator("#quantity").fill("20");
  await page.locator("#save-trade").click();
  await expect(page.locator("#durable-save-status")).toContainText(
    "دلیل اصلاح",
  );
  expect((await snapshot(page)).data.trades[0].quantity).toBe("10");
  await page.locator(".economic-editor > summary").click();
  await page.locator("#correction-reason").fill("تصحیح حجم ثبت‌شده");
  await page.locator("#correction-stop").fill("90");
  await page.locator("#correction-target").fill("120");
  await page.locator("#save-trade").click();
  await acceptDialog(page);
  await expect
    .poll(async () => (await snapshot(page)).data.trades[0].quantity)
    .toBe("20");
  await openJournal(page, "settings/data", false);
  const event = page.waitForEvent("download");
  await page.locator("#export-json").click();
  const download = await event,
    path = await download.path();
  const json = JSON.parse(await readFile(path!, "utf8"));
  expect(json.auditEvents).toHaveLength(1);
  expect(json.auditEvents[0].reason).toBe("تصحیح حجم ثبت‌شده");
  await page.locator("#json-file").setInputFiles(path!);
  await acceptDialog(page);
  const next = page.waitForEvent("download");
  await page.locator("#export-json").click();
  const restored = JSON.parse(
    await readFile((await (await next).path())!, "utf8"),
  );
  expect(restored.auditEvents).toHaveLength(1);
  await openJournal(page, "settings/data", true);
  await page.locator("#json-file").setInputFiles(path!);
  await acceptDialog(page);
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  await openJournal(page, "settings/data", false);
  expect((await snapshot(page)).data.trades).toHaveLength(1);
});

test("cleans abandoned image bytes and preserves attached images in full JSON backups", async ({
  page,
}) => {
  await newTrade(page);
  const image = await testImage(page);
  await page.locator("#trade-image-files").setInputFiles(image);
  await expect(page.locator("#trade-image-previews figure")).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator("#trade-image-previews img")
        .evaluateAll(
          (images) =>
            images.every(
              (image) => (image as HTMLImageElement).naturalWidth > 0,
            ) && images.length > 0,
        ),
    )
    .toBe(true);
  expect(await assetCount(page)).toBe(1);
  await page.locator(".trade-image-preview-remove").click();
  await expect.poll(() => assetCount(page)).toBe(0);
  await page.locator("#trade-image-files").setInputFiles(image);
  await expect(page.locator("#trade-image-previews figure")).toHaveCount(1);
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  await openJournal(page, "settings/data", false);
  const event = page.waitForEvent("download");
  await page.locator("#export-json").click();
  const download = await event;
  const json = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(json.imageAssets).toHaveLength(1);
  expect(json.trades[0].images[0].id).toBe(json.imageAssets[0].id);
  expect(json.imageAssets[0].dataUrl).toMatch(/^data:image\/webp;base64,/);
  await page.locator("#json-file").setInputFiles({
    name: "images.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(json)),
  });
  await acceptDialog(page);
  await openJournal(page, "trade=" + json.trades[0].id, false);
  await expect(page.locator(".position-detail-image-button")).toBeEnabled();
  await page.locator(".position-detail-image-button").click();
  await expect(page.locator("#trade-image-viewer-image")).toBeVisible();
});

test("restores an autosaved editor draft after reload", async ({ page }) => {
  await newTrade(page, "DRAFT");
  await page.locator("#quantity").fill("7");
  await page.waitForTimeout(900);
  await page.reload();
  await page.waitForFunction(() => typeof EdgeJournal !== "undefined");
  await acceptDialog(page);
  await expect(page.locator("#symbol")).toHaveValue("DRAFT");
  await expect(page.locator("#quantity")).toHaveValue("۷");
});
test("restores an existing-trade draft without replacing it with the initialization values", async ({
  page,
}) => {
  await newTrade(page, "EDITDRAFT");
  await page.locator("#save-trade").click();
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(1);
  const id = (await snapshot(page)).data.trades[0].id;
  await openJournal(page, "trade-edit=" + id, false);
  await page.locator("#accordion-notes-trigger").click();
  await page.locator("#notes").fill("یادداشت ذخیره‌نشدهٔ ویرایش");
  await page.waitForTimeout(900);
  await page.reload();
  await acceptDialog(page);
  await expect(page.locator("#notes")).toHaveValue(
    "یادداشت ذخیره‌نشدهٔ ویرایش",
  );
  await page.locator("#save-trade").click();
  await expect
    .poll(
      async () =>
        (await snapshot(page)).data.trades.find((trade) => trade.id === id)
          ?.notes,
    )
    .toBe("یادداشت ذخیره‌نشدهٔ ویرایش");
  expect((await snapshot(page)).data.trades).toHaveLength(1);
});

test("exports and imports an encrypted backup without persisting its password", async ({
  page,
}) => {
  await openJournal(page, "settings/data");
  await page
    .getByRole("button", { name: "پشتیبان رمزدار", exact: true })
    .click();
  await page.locator("#edge-backup-password").fill("correct horse battery");
  const event = page.waitForEvent("download");
  await acceptDialog(page);
  const download = await event,
    path = await download.path();
  const envelope = JSON.parse(await readFile(path!, "utf8"));
  expect(envelope.format).toBe("edge-journal-encrypted");
  expect(envelope.ciphertext).not.toContain("test-position");
  await openJournal(page, "settings/data", false);
  const before = (await snapshot(page)).revision;
  await page.locator("#json-file").setInputFiles(path!);
  await page.locator("#edge-backup-password").fill("wrong password");
  await acceptDialog(page);
  await expect(page.locator("#toast-region")).toContainText("رمز");
  expect((await snapshot(page)).revision).toBe(before);
  await page.locator("#json-file").setInputFiles(path!);
  await page.locator("#edge-backup-password").fill("correct horse battery");
  await acceptDialog(page);
  await acceptDialog(page);
  await expect
    .poll(async () => (await snapshot(page)).data.trades.length)
    .toBe(100);
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((value) =>
        value.includes("correct horse battery"),
      ),
    ),
  ).toBe(false);
});

test("prevents a second tab from overwriting a newer revision", async ({
  page,
  context,
}) => {
  await openJournal(page, "settings", false);
  const other = await context.newPage();
  await openJournal(other, "settings", false);
  await page.locator("#currency").fill("EUR");
  await page.locator("#save-general-settings").click();
  await expect(page.locator("#durable-save-status")).toContainText("ذخیره شد");
  await other.locator("#currency").fill("GBP");
  await other.locator("#save-general-settings").click();
  await expect(other.locator("#durable-save-status")).toContainText("تب دیگری");
  expect((await snapshot(page)).data.settings.currency).toBe("EUR");
});

test("keeps independent drafts when another live tab has cloned session storage", async ({
  page,
  context,
}) => {
  await newTrade(page, "DRAFT-A");
  await page.waitForTimeout(900);
  const originalDraftId = await page.evaluate(() =>
    sessionStorage.getItem("edge-journal:draft:live"),
  );
  expect(originalDraftId).toBeTruthy();
  const other = await context.newPage();
  await other.addInitScript((id) => {
    if (!sessionStorage.getItem("edge-journal:draft:live"))
      sessionStorage.setItem("edge-journal:draft:live", id!);
  }, originalDraftId);
  await openJournal(other, "trade-new", false);
  await expect(other.locator(".edge-dialog[open]")).toHaveCount(0);
  const secondDraftId = await other.evaluate(() =>
    sessionStorage.getItem("edge-journal:draft:live"),
  );
  expect(secondDraftId).not.toBe(originalDraftId);
  await other.locator("#symbol").fill("DRAFT-B");
  await other.locator("#entry").fill("200");
  await other.locator("#stop").fill("190");
  await other.locator("#target").fill("220");
  await other.locator("#quantity").fill("2");
  await other.waitForTimeout(900);

  await page.reload();
  await acceptDialog(page);
  await expect(page.locator("#symbol")).toHaveValue("DRAFT-A");
  await other.reload();
  await acceptDialog(other);
  await expect(other.locator("#symbol")).toHaveValue("DRAFT-B");
  expect((await snapshot(page)).data.trades).toHaveLength(0);
});
