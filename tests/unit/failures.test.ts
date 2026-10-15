import { afterEach, describe, expect, it, vi } from "vitest";
import { openDB, unwrap, type IDBPDatabase } from "idb";
import { forceCloseDatabase } from "fake-indexeddb";
import {
  JournalRepository,
  hashBytes,
  journalHash,
} from "../../src/persistence/repository";
import { journal, normalize, rawTrade } from "../fixtures/journal";
import {
  canonicalTrade,
  calculateInitialPlan,
  normalizeEconomics,
} from "../../src/domain/economics";
import { nonNegative, positive } from "../../src/domain/numbers";

const repositories: JournalRepository[] = [];
const repo = (name = crypto.randomUUID()) => {
  const value = new JournalRepository(normalize, name);
  repositories.push(value);
  return value;
};
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await Promise.all(repositories.splice(0).map((value) => value.close()));
});
describe("storage failure boundaries", () => {
  it("retries known Blob storage failures atomically with binary bytes", async () => {
    const repository = repo(),
      blob = new Blob(["abc"], { type: "image/png" }),
      asset = {
        id: "img-binary",
        name: "a",
        blob,
        hash: await hashBytes(blob),
        size: 3,
        type: "image/png",
        width: 1,
        height: 1,
      };
    const original = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      value,
      key,
    ) {
      if (this.name === "assets" && value.blob instanceof Blob)
        throw new Error(
          "Error preparing Blob/File data to be stored in object store",
        );
      return original.call(this, value, key);
    });
    const draft = {
      id: "binary-draft",
      mode: "live" as const,
      payload: {},
      assetIds: [asset.id],
      updatedAt: "",
    };
    await repository.stageAsset(asset, draft);
    expect(await (await repository.getAsset(asset.id))?.blob.text()).toBe(
      "abc",
    );
    const other = repo(),
      data = journal();
    data.trades[0].images = [asset];
    expect(
      await other.commit("live", 0, { data, assets: [asset] }),
    ).toMatchObject({ ok: true, revision: 1 });
    expect((await other.exportSnapshot("live"))?.assets[0].blob).toBeInstanceOf(
      Blob,
    );
  });
  it("returns an actionable read-only state when opening an upgrade is blocked", async () => {
    const original = indexedDB.open.bind(indexedDB);
    vi.spyOn(indexedDB, "open").mockImplementation((name, version) => {
      const request = original(name, version),
        add = request.addEventListener.bind(request);
      request.addEventListener = ((
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) => {
        add(type, listener, options);
        if (type === "blocked")
          queueMicrotask(() =>
            (listener as EventListener)({
              oldVersion: 0,
              newVersion: 1,
            } as unknown as Event),
          );
      }) as typeof request.addEventListener;
      return request;
    });
    const repository = repo();
    const result = await repository.loadJournal("live", journal());
    expect(result.status).toBe("storage-unavailable");
    expect(result.error).toContain("قفل");
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  it("hashes logical records independently of database iteration order", async () => {
    const first = journal({ options: { z: [], a: [] } });
    first.accounts.push({ ...first.accounts[0], id: "second" });
    first.trades.push(canonicalTrade(rawTrade({ id: "second" }), "USD"));
    const reversed = {
      ...first,
      options: { a: [], z: [] },
      accounts: [...first.accounts].reverse(),
      trades: [...first.trades].reverse(),
    };
    expect(await journalHash(first)).toBe(await journalHash(reversed));
  });
  it("notifies other subscribers and stops notifying unsubscribed listeners", async () => {
    const name = crypto.randomUUID(),
      first = repo(name),
      second = repo(name),
      listener = vi.fn();
    const unsubscribe = second.subscribe(listener);
    await first.loadJournal("live", journal());
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith("live", 1));
    unsubscribe();
    await first.commit("live", 1, { data: journal() });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it("closes connections for version upgrades and reports unexpected termination", async () => {
    const name = crypto.randomUUID(),
      repository = repo(name);
    await repository.loadJournal("live", journal());
    const dispatch = vi.fn();
    vi.stubGlobal("dispatchEvent", dispatch);
    const connection = await (
      repository as unknown as { db: () => Promise<IDBPDatabase> }
    ).db();
    // fake-indexeddb's declaration uses the constructor type for its instance argument.
    forceCloseDatabase(
      unwrap(connection) as unknown as Parameters<typeof forceCloseDatabase>[0],
    );
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect((await repository.loadJournal("live", journal())).status).toBe(
      "ready",
    );
    const upgraded = await openDB(name, 2);
    upgraded.close();
    expect((await repository.loadJournal("live", journal())).status).toBe(
      "storage-unavailable",
    );
  });
  it("restores automatic snapshots with their audited history", async () => {
    const repository = repo();
    await repository.loadJournal("live", journal());
    await repository.commit("live", 1, {
      data: journal({ trades: [] }),
      destructive: true,
    });
    const saved = (await repository.listSnapshots("live"))[0];
    expect((await repository.restoreSnapshot("live", saved.id, 2)).ok).toBe(
      true,
    );
    expect((await repository.exportSnapshot("live"))?.data.trades).toHaveLength(
      1,
    );
    expect(await repository.restoreSnapshot("demo", saved.id, 0)).toMatchObject(
      { ok: false, reason: "validation" },
    );
  });
  it("requires complete legacy images and retains pinned asset references", async () => {
    const repository = repo(),
      data = journal();
    data.trades[0].images = [
      {
        id: "img-missing",
        name: "x",
        type: "image/png",
        size: 3,
        width: 1,
        height: 1,
      },
    ];
    const result = await repository.loadJournal(
      "live",
      journal({ trades: [] }),
      { key: "legacy", raw: JSON.stringify({ ...data, version: 11 }) },
    );
    expect(result.status).toBe("recovery-required");
    expect((await repository.listSnapshots("live"))[0].assetIds).toEqual([
      "img-missing",
    ]);
  });
  it("keeps future current journals read-only and handles unsuccessful migration commits", async () => {
    const name = crypto.randomUUID(),
      repository = repo(name);
    await repository.loadJournal("live", journal());
    const db = await openDB(name);
    const meta = await db.get("journals", "live");
    await db.put("journals", { ...meta, version: 999 });
    db.close();
    expect((await repository.loadJournal("live", journal())).status).toBe(
      "unsupported-version",
    );
    expect(
      await repository.commit("live", 1, { data: journal() }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
    const migration = repo();
    vi.spyOn(migration, "commit").mockResolvedValue({
      ok: false,
      reason: "quota",
      message: "full",
    });
    expect(
      (
        await migration.loadJournal("live", journal(), {
          key: "old",
          raw: JSON.stringify(journal({ version: 7 })),
        })
      ).status,
    ).toBe("storage-unavailable");
    expect((await migration.listSnapshots("live"))[0].pinned).toBe(true);
  });
  it("rejects stale staging generations and invalid asset identities", async () => {
    const repository = repo(),
      blob = new Blob(["a"]),
      asset = {
        id: "img-x",
        name: "",
        blob,
        hash: await hashBytes(blob),
        size: 1,
        type: "image/png",
        width: 1,
        height: 1,
      };
    const draft = {
      id: "d",
      mode: "live" as const,
      payload: {},
      assetIds: [asset.id],
      updatedAt: "",
      generation: 2,
    };
    await repository.saveDraft(draft);
    await expect(
      repository.stageAsset(asset, { ...draft, generation: 1 }),
    ).rejects.toThrow("پیش‌نویس");
    await repository.stageAsset(asset, draft);
    const conflict = {
      ...asset,
      blob: new Blob(["b"]),
      hash: await hashBytes(new Blob(["b"])),
    };
    await expect(repository.stageAsset(conflict, draft)).rejects.toThrow(
      "تداخل",
    );
  });
  it("aborts writes already queued if quota fails later in the same transaction", async () => {
    const repository = repo();
    await repository.loadJournal("live", journal());
    const original = IDBObjectStore.prototype.put;
    const failure = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (this: IDBObjectStore, value, key) {
        if (this.name === "journals")
          throw new DOMException("Storage quota full", "QuotaExceededError");
        return original.call(this, value, key);
      });
    const result = await repository.commit("live", 1, {
      data: journal({ settings: { currency: "EUR" }, trades: [] }),
    });
    expect(result).toMatchObject({ ok: false, reason: "quota" });
    failure.mockRestore();
    expect((await repository.exportSnapshot("live"))?.data.trades).toHaveLength(
      1,
    );
    expect((await repository.exportSnapshot("live"))?.revision).toBe(1);
  });
  it("shows a readable journal when storage cannot open and blocks subsequent writes", async () => {
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new Error("Storage disabled");
    });
    const repository = repo(),
      source = { key: "legacy", raw: JSON.stringify(journal()) };
    const result = await repository.loadJournal(
      "live",
      journal({ trades: [] }),
      source,
    );
    expect(result.status).toBe("storage-unavailable");
    expect(result.data.trades).toHaveLength(1);
    expect(result.source).toEqual(source);
    expect(
      await repository.commit("live", 0, { data: journal() }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
  });
  it("does not choose incomplete migrations when preserving the source fails", async () => {
    const repository = repo();
    vi.spyOn(repository, "preserveSource").mockRejectedValue(
      new Error("Snapshot failed"),
    );
    const result = await repository.loadJournal(
      "live",
      journal({ trades: [] }),
      { key: "legacy", raw: JSON.stringify(journal({ version: 7 })) },
    );
    expect(result.status).toBe("storage-unavailable");
    expect(result.data.trades).toHaveLength(1);
    expect(await repository.exportSnapshot("live")).toBeNull();
  });
  it("loads corrupted current records into read-only recovery and preserves source bytes", async () => {
    const name = crypto.randomUUID(),
      repository = repo(name);
    await repository.loadJournal("live", journal());
    const db = await openDB(name);
    await db.put("trades", {
      mode: "live",
      id: "trade-1",
      data: rawTrade({ quantity: 0 }),
    });
    db.close();
    const result = await repository.loadJournal("live", journal());
    expect(result.status).toBe("recovery-required");
    expect(result.source?.key).toBe("indexeddb:live");
    expect(
      await repository.commit("live", 1, { data: journal() }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
  });
  it("preserves readable records when an image disappears", async () => {
    const name = crypto.randomUUID(),
      repository = repo(name);
    await repository.loadJournal("live", journal());
    const db = await openDB(name),
      data = journal().trades[0];
    data.images = [
      {
        id: "img-missing",
        name: "x",
        size: 1,
        type: "image/png",
        width: 1,
        height: 1,
      },
    ];
    await db.put("trades", { mode: "live", id: data.id, data });
    db.close();
    await expect(repository.exportSnapshot("live")).rejects.toThrow("تصویر");
    const result = await repository.loadJournal(
      "live",
      journal({ trades: [] }),
    );
    expect(result.status).toBe("recovery-required");
    expect(result.data.trades).toHaveLength(1);
  });
  it("rejects invalid records and invalid asset hashes without a write", async () => {
    const repository = repo();
    expect(
      await repository.commit("live", 0, {
        data: journal({ trades: [rawTrade({ quantity: 0 })] }),
      }),
    ).toMatchObject({ ok: false, reason: "validation" });
    const blob = new Blob(["abc"]);
    expect(
      await repository.commit("live", 0, {
        data: journal(),
        assets: [
          {
            id: "img-x",
            name: "",
            blob,
            hash: "wrong",
            size: 3,
            type: "image/png",
            width: 1,
            height: 1,
          },
        ],
      }),
    ).toMatchObject({ ok: false, reason: "validation" });
  });
  it("appends new records, retains the prior journal, and persists correction audit events", async () => {
    const repository = repo();
    await repository.loadJournal("live", journal());
    const second = journal({
      trades: [canonicalTrade(rawTrade({ id: "next" }), "USD")],
    });
    expect(
      (
        await repository.commitImport(
          repository.previewImport(second, "live", 1, [], "append"),
        )
      ).ok,
    ).toBe(true);
    const event = {
      id: "correction",
      mode: "live" as const,
      tradeId: "trade-1",
      reason: "test correction",
      before: journal().trades[0],
      after: journal().trades[0],
      createdAt: new Date().toISOString(),
    };
    const data = (await repository.exportSnapshot("live"))!.data;
    await repository.commit("live", 2, { data, audit: [event] });
    expect(await repository.auditTrail("live")).toEqual([event]);
    expect((await repository.exportSnapshot("live"))?.auditEvents).toEqual([
      event,
    ]);
    await repository.commit("live", 3, { data, audit: [], replaceAudit: true });
    expect(await repository.auditTrail("live")).toEqual([]);
  });
  it("stores drafts and rolls back an asset whose draft cannot be stored", async () => {
    const repository = repo();
    const draft = {
      id: "draft",
      mode: "live" as const,
      payload: { notes: "saved" },
      assetIds: [],
      updatedAt: "",
    };
    await repository.saveDraft(draft);
    expect(await repository.getDraft("draft")).toEqual(draft);
    const blob = new Blob(["abc"]),
      asset = {
        id: "img-x",
        name: "",
        blob,
        hash: await hashBytes(blob),
        size: 3,
        type: "image/png",
        width: 1,
        height: 1,
      };
    const original = IDBObjectStore.prototype.put;
    const failure = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (this: IDBObjectStore, value, key) {
        if (this.name === "drafts")
          throw new DOMException("Uncloneable", "DataCloneError");
        return original.call(this, value, key);
      });
    await expect(repository.stageAsset(asset, draft)).rejects.toThrow();
    failure.mockRestore();
    expect(await repository.getAsset(asset.id)).toBeUndefined();
    await expect(
      repository.stageAsset({ ...asset, hash: "invalid" }, draft),
    ).rejects.toThrow();
  });
});
describe("financial boundary branches", () => {
  it("validates every settlement price and fill increment, including actual calendar dates", () => {
    const instrument = {
      ...journal().trades[0].instrument,
      quantityIncrement: "2",
      priceIncrement: ".5",
    };
    const fill = {
      id: "f",
      price: "120",
      quantity: "2",
      fxRate: "1",
      fees: "0",
      feeFxRate: "1",
      date: "",
      time: "",
    };
    for (const override of [
      { stop: "90.1" },
      { target: "120.1" },
      { exit: "110.1" },
      { exit: "0" },
      { feesCurrency: "invalid currency" },
      { fills: [{ ...fill, price: "120.1" }] },
      { fills: [{ ...fill, quantity: "1" }] },
      { fills: [{ ...fill, date: "2026-02-30" }] },
    ])
      expect(() =>
        canonicalTrade(rawTrade({ instrument, ...override }), "USD"),
      ).toThrow();
    expect(
      canonicalTrade(rawTrade({ instrument, fills: [fill] }), "USD").fills,
    ).toHaveLength(1);
  });
  it("checks positive and nonnegative inputs and preserves signed short plans", () => {
    expect(() => positive(0)).toThrow();
    expect(() => nonNegative(-1)).toThrow();
    expect(nonNegative("").toString()).toBe("0");
    expect(nonNegative(null).toString()).toBe("0");
    expect(
      calculateInitialPlan(
        rawTrade({ direction: "short", stop: 110, target: 80 }),
      ).risk,
    ).toBe("100");
    expect(() => calculateInitialPlan(rawTrade({ entry: 0 }))).toThrow();
  });
  it("rejects nonpositive fill prices, planned fills, invalid same-day chronology, and excessive exits", () => {
    const fill = {
      id: "f",
      price: "0",
      quantity: "1",
      fxRate: "1",
      fees: "0",
      feeFxRate: "1",
      date: "",
      time: "",
    };
    expect(() => normalizeEconomics(rawTrade({ fills: [fill] }))).toThrow();
    expect(() =>
      normalizeEconomics(
        rawTrade({ status: "planned", fills: [{ ...fill, price: "110" }] }),
      ),
    ).toThrow();
    expect(() =>
      normalizeEconomics(
        rawTrade({
          fills: [{ ...fill, price: "110", date: "2026-10-14", time: "09:00" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      normalizeEconomics(
        rawTrade({
          fills: [{ ...fill, price: "110", date: "2026-10-14", time: "12:00" }],
        }),
      ),
    ).toThrow();
  });
  it("preserves legacy R exits economically", () => {
    const trade = canonicalTrade(
      rawTrade({ exit: 110, partialExits: [{ id: "p", r: 2, percent: 50 }] }),
      "USD",
    );
    expect(trade.netPnl).toBe("140");
  });
});
