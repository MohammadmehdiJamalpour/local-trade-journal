import { test, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { syntheticImage } from "../fixtures/images";
import { journalHash } from "../../src/persistence/repository";
import { openJournal, snapshot } from "./helpers";

test("image stress: 10000 trades, 200 images, startup and repeated gallery memory", async ({
  page,
  context,
  browser,
  browserName,
}, info) => {
  test.skip(
    browserName !== "chromium",
    "Heap measurements require Chromium CDP.",
  );
  test.setTimeout(240000);
  const artifactSha256 = createHash("sha256")
    .update(await readFile("dist/index.html"))
    .digest("hex");
  await openJournal(page);
  const original = (await snapshot(page)).data,
    assets = Array.from({ length: 200 }, (_, index) => syntheticImage(index));
  const data = {
    ...original,
    trades: Array.from({ length: 10000 }, (_, index) => ({
      ...original.trades[index % original.trades.length],
      id: "stress-" + String(index).padStart(6, "0"),
      images:
        index < 200
          ? [
              {
                id: assets[index].id,
                name: assets[index].name,
                type: assets[index].type,
                size: assets[index].size,
                width: assets[index].width,
                height: assets[index].height,
              },
            ]
          : [],
    })),
  };
  const checksum = await journalHash(data);
  await page.evaluate(
    ({ data, assets, checksum }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("edge-journal");
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction(["trades", "assets", "journals"], "readwrite");
          tx.objectStore("trades").clear();
          for (const trade of data.trades)
            tx.objectStore("trades").put({
              mode: "demo",
              id: trade.id,
              data: trade,
            });
          for (const asset of assets) {
            const { base64, ...metadata } = asset;
            const bytes = Uint8Array.from(atob(base64), (char) =>
              char.charCodeAt(0),
            );
            tx.objectStore("assets").put({
              ...metadata,
              blob: new Blob([bytes], { type: asset.type }),
            });
          }
          tx.objectStore("journals").put({
            mode: "demo",
            revision: 1,
            version: 13,
            settings: data.settings,
            checksum,
            updatedAt: "",
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
    { data, assets, checksum },
  );
  const startup: number[] = [];
  for (let run = 0; run < 20; run++) {
    await page.goto("/index.html?demo=1&image-benchmark=" + run + "#trades");
    await page.waitForFunction(
      () => document.documentElement.dataset.journalReady === "true",
    );
    startup.push(await page.evaluate(() => performance.now()));
  }
  expect((await snapshot(page)).assets).toHaveLength(200);
  const client = await context.newCDPSession(page);
  await client.send("Performance.enable");
  const measure = async () => {
    await client.send("HeapProfiler.collectGarbage");
    const result = await client.send("Performance.getMetrics"),
      dom = await client.send("Memory.getDOMCounters");
    return {
      heap: result.metrics.find((item) => item.name === "JSHeapUsedSize")!
        .value,
      nodes: dom.nodes,
    };
  };
  const memory: { heap: number; nodes: number }[] = [];
  const cycle = async (index: number) => {
    await page.evaluate((value) => {
      location.hash = "#trade=stress-" + String(value).padStart(6, "0");
    }, index);
    const preview = page.locator(".position-detail-image-button").first();
    await expect(preview).toBeEnabled();
    await preview.click();
    await expect(page.locator("#trade-image-viewer-image")).toBeVisible();
    await page.locator("#close-trade-image-viewer").click();
    await page.evaluate(() => {
      location.hash = "#trades";
    });
    await expect(page.locator("#trades-page")).toBeVisible();
  };
  for (let run = 0; run < 5; run++) await cycle(run);
  memory.push(await measure());
  for (let run = 0; run < 20; run++) {
    await cycle(run);
    if (run % 5 === 4) memory.push(await measure());
  }
  const p95 = [...startup].sort((a, b) => a - b)[18];
  const report = {
    protocolVersion: 2,
    artifactSha256,
    browser: browser.version(),
    count: 10000,
    images: 200,
    averageImageKiB:
      assets.reduce((sum, asset) => sum + asset.size, 0) / 200 / 1024,
    startup,
    interactiveP95: p95,
    memory,
  };
  await mkdir("output/performance", { recursive: true });
  await writeFile(
    "output/performance/images-" + info.project.name + ".json",
    JSON.stringify(report, null, 2),
  );
  await info.attach("image-memory", {
    body: JSON.stringify(report),
    contentType: "application/json",
  });
  expect(p95).toBeLessThanOrEqual(3000);
  expect(memory.at(-1)!.heap - memory[0].heap).toBeLessThan(5 * 1024 * 1024);
  expect(memory.at(-1)!.nodes - memory[0].nodes).toBeLessThan(2000);
});
