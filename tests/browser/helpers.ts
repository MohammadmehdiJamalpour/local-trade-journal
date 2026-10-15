import { expect, type Page } from "@playwright/test";
import type { JournalData } from "../../src/domain/types";

declare global {
  var EdgeJournal: {
    version: number;
    getSnapshot: () => Promise<{
      data: JournalData;
      revision: number;
      assets: unknown[];
    }>;
    getStatus: () => { status: string };
    normalizeTrade: (raw: unknown) => { trade: unknown; errors: string[] };
    calculateClosed: (raw: unknown) => {
      netPnl: number;
      realizedR: number;
      outcome: string;
    };
    parseCSV: (text: string) => string[][];
    parseLocalizedNumber: (value: unknown) => number | null;
    formatPersianDateInput: (value: string) => string;
    parsePersianDate: (value: string) => string;
  };
}
export async function openJournal(
  page: Page,
  route = "dashboard",
  demo = true,
) {
  await page.goto("/index.html?demo=" + (demo ? "1" : "0") + "#" + route);
  await page.waitForFunction(
    () =>
      typeof EdgeJournal !== "undefined" &&
      document.documentElement.dataset.journalReady === "true",
  );
  await expect(page.locator("#durable-save-status")).toBeVisible();
}
export async function snapshot(page: Page) {
  return page.evaluate(() => EdgeJournal.getSnapshot());
}
export async function acceptDialog(page: Page) {
  await page
    .locator(".edge-dialog")
    .getByRole("button", { name: "تأیید", exact: true })
    .click();
}
