import { test, expect } from "@playwright/test";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { cpus, totalmem, platform } from "node:os";
import { journalHash } from "../../src/persistence/repository";
import { openJournal, snapshot } from "./helpers";

test("20-run production benchmark at 1000 and 10000 trades", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(300000);
  const artifactSha256 = createHash("sha256")
    .update(await readFile("dist/index.html"))
    .digest("hex");
  await openJournal(page);
  const original = (await snapshot(page)).data;
  const measurements: {
    count: number;
    interactiveMs: number[];
    inputMs: number[];
    resultsMs: number[];
    reportMs: number[];
  }[] = [];
  for (const count of [1000, 10000]) {
    const data = {
      ...original,
      trades: Array.from({ length: count }, (_, index) => ({
        ...original.trades[index % original.trades.length],
        id: "benchmark-" + String(index).padStart(6, "0"),
      })),
    };
    const checksum = await journalHash(data);
    await page.evaluate(
      ({ data, checksum }) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open("edge-journal");
          request.onsuccess = () => {
            const db = request.result,
              tx = db.transaction(
                ["trades", "accounts", "catalogs", "journals"],
                "readwrite",
              );
            const store = tx.objectStore("trades");
            store.clear();
            data.trades.forEach((trade) =>
              store.put({ mode: "demo", id: trade.id, data: trade }),
            );
            data.accounts.forEach((account) =>
              tx
                .objectStore("accounts")
                .put({ mode: "demo", id: account.id, data: account }),
            );
            Object.entries(data.options).forEach(([id, value]) =>
              tx.objectStore("catalogs").put({ mode: "demo", id, data: value }),
            );
            tx.objectStore("journals").put({
              mode: "demo",
              revision: 1,
              version: 13,
              settings: data.settings,
              updatedAt: "",
              checksum,
            });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onabort = () => reject(tx.error);
          };
          request.onerror = () => reject(request.error);
        }),
      { data, checksum },
    );
    const row = {
      count,
      interactiveMs: [] as number[],
      inputMs: [] as number[],
      resultsMs: [] as number[],
      reportMs: [] as number[],
    };
    for (let run = 0; run < 20; run++) {
      // A distinct ignored query value forces exactly one full navigation per sample.
      // goto(same URL) followed by reload can start the previous sample twice.
      await page.goto(
        "/index.html?demo=1&benchmark=" + count + "-" + run + "#trades",
      );
      await page.waitForFunction(
        () =>
          typeof EdgeJournal !== "undefined" &&
          document.documentElement.dataset.journalReady === "true" &&
          document.title.startsWith("معاملات"),
      );
      // Exporting the first fixture is a separate integrity assertion, not startup work.
      row.interactiveMs.push(await page.evaluate(() => performance.now()));
      if (run === 0)
        expect((await snapshot(page)).data.trades).toHaveLength(count);
      const input = await page.evaluate(async () => {
        const control =
          document.querySelector<HTMLInputElement>("#filter-symbol")!;
        const started = performance.now();
        control.value = "BTC";
        control.dispatchEvent(new Event("input", { bubbles: true }));
        const handler = performance.now() - started;
        await new Promise<void>((resolve) => {
          const timer = setInterval(() => {
            const links = Array.from(
              document.querySelectorAll('#trade-rows a[href^="#trade="]'),
            );
            if (
              links.length &&
              links.every((link) => link.textContent?.includes("BTC"))
            ) {
              clearInterval(timer);
              resolve();
            }
          }, 10);
        });
        return { handler, results: performance.now() - started };
      });
      row.inputMs.push(input.handler);
      row.resultsMs.push(input.results);
      if (count >= 2000)
        row.reportMs.push(
          await page.evaluate(async () => {
            const previous = document.documentElement.dataset.reportQuery;
            const started = performance.now();
            const control =
              document.querySelector<HTMLInputElement>("#filter-symbol")!;
            control.value = "";
            control.dispatchEvent(new Event("input", { bubbles: true }));
            location.hash = "#dashboard";
            await new Promise<void>((resolve) => {
              const timer = setInterval(() => {
                if (
                  document.documentElement.dataset.reportQuery !== previous &&
                  !document
                    .querySelector("#metric-live")
                    ?.textContent?.includes("در حال")
                ) {
                  clearInterval(timer);
                  resolve();
                }
              }, 10);
            });
            return performance.now() - started;
          }),
        );
    }
    measurements.push(row);
  }
  const p95 = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
  const report = {
    protocolVersion: 2,
    artifactSha256,
    platform: platform(),
    cpu: cpus()[0].model,
    memoryGiB: totalmem() / 1024 ** 3,
    browser: browser.version(),
    samples: 20,
    measurements,
    summary: measurements.map((row) => ({
      count: row.count,
      interactiveP95: p95(row.interactiveMs),
      inputP95: p95(row.inputMs),
      resultsP95: p95(row.resultsMs),
      ...(row.reportMs.length ? { reportP95: p95(row.reportMs) } : {}),
    })),
  };
  await mkdir("output/performance", { recursive: true });
  await writeFile(
    "output/performance/report.json",
    JSON.stringify(report, null, 2),
  );
  await info.attach("performance", {
    body: JSON.stringify(report),
    contentType: "application/json",
  });
  for (const row of report.summary) {
    expect(row.interactiveP95).toBeLessThanOrEqual(
      row.count === 1000 ? 1500 : 3000,
    );
    expect(row.inputP95).toBeLessThanOrEqual(16);
    expect(row.resultsP95).toBeLessThanOrEqual(250);
    if (row.reportP95 != null) expect(row.reportP95).toBeLessThanOrEqual(500);
  }
});
