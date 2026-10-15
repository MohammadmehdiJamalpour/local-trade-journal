import { afterEach, describe, expect, it, vi } from "vitest";
import { openDB } from "idb";
import {
  JournalRepository,
  hashBytes,
  journalHash,
} from "../../src/persistence/repository";
import { canonicalTrade } from "../../src/domain/economics";
import type { AuditEvent } from "../../src/domain/types";
import { journal, normalize, rawTrade } from "../fixtures/journal";

const repositories: JournalRepository[] = [];
function repo() {
  const name = crypto.randomUUID(),
    repository = new JournalRepository(normalize, name);
  repositories.push(repository);
  return { name, repository };
}
function audit(id = "audit-1"): AuditEvent {
  return {
    id,
    mode: "live",
    tradeId: "trade-1",
    reason: "Corrected exit price",
    before: journal().trades[0],
    after: canonicalTrade(rawTrade({ exit: "121" }), "USD"),
    createdAt: "2026-10-15T10:00:00.000Z",
  };
}
async function injectAudit(name: string, value: unknown) {
  const db = await openDB(name);
  try {
    await db.put("audit", value);
  } finally {
    db.close();
  }
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    repositories.splice(0).map((repository) => repository.close()),
  );
});

describe("persisted audit boundaries and recovery", () => {
  it("commits, loads and exports a canonical valid correction", async () => {
    const { repository } = repo();
    await repository.loadJournal("live", journal());
    const event = audit();
    event.reason = "  Corrected exit price  ";
    event.after.netPnl = "999999";
    expect(
      await repository.commit("live", 1, { data: journal(), audit: [event] }),
    ).toMatchObject({ ok: true, revision: 2 });
    const history = await repository.auditTrail("live");
    expect(history[0].reason).toBe("Corrected exit price");
    expect(history[0].after.netPnl).toBe("200");
    expect((await repository.loadJournal("live", journal())).status).toBe(
      "ready",
    );
    expect((await repository.exportSnapshot("live"))?.auditEvents).toEqual(
      history,
    );
  });

  it.each([
    { before: null },
    { after: { ...journal().trades[0], quantity: "-1" } },
    { reason: "  " },
    { mode: "demo" },
    { tradeId: "unrelated" },
  ])(
    "rejects malformed audit commands before any journal write: %j",
    async (override) => {
      const { repository } = repo();
      await repository.loadJournal("live", journal());
      const event = { ...audit(), ...override } as unknown as AuditEvent;
      expect(
        await repository.commit("live", 1, {
          data: journal({ trades: [] }),
          audit: [event],
        }),
      ).toMatchObject({ ok: false, reason: "validation" });
      expect((await repository.exportSnapshot("live"))?.revision).toBe(1);
      expect(await repository.auditTrail("live")).toEqual([]);
      expect(
        (await repository.exportSnapshot("live"))?.data.trades,
      ).toHaveLength(1);
    },
  );

  it("rejects duplicated new IDs and attempts to rewrite an immutable existing event", async () => {
    const { repository } = repo();
    await repository.loadJournal("live", journal());
    const event = audit();
    expect(
      await repository.commit("live", 1, {
        data: journal(),
        audit: [event, event],
      }),
    ).toMatchObject({ ok: false, reason: "validation" });
    await repository.commit("live", 1, { data: journal(), audit: [event] });
    expect(
      await repository.commit("live", 2, {
        data: journal(),
        audit: [{ ...event, reason: "Replacement" }],
      }),
    ).toMatchObject({ ok: false, reason: "validation" });
    expect(await repository.auditTrail("live")).toEqual([event]);
    expect((await repository.exportSnapshot("live"))?.revision).toBe(2);
  });

  it("detects stored audit corruption even when journal bytes still match the checksum", async () => {
    const { repository, name } = repo();
    await repository.loadJournal("live", journal());
    const corrupt = { ...audit("broken-audit"), before: null };
    await injectAudit(name, corrupt);
    const result = await repository.loadJournal(
      "live",
      journal({ trades: [] }),
    );
    expect(result.status).toBe("recovery-required");
    expect(result.revision).toBe(1);
    expect(result.data.trades).toHaveLength(1);
    expect(
      result.rejected.some(
        (row) => (row.raw as { id?: string }).id === "broken-audit",
      ),
    ).toBe(true);
    expect(JSON.parse(result.source!.raw).auditEvents).toEqual([corrupt]);
    const original = (await repository.listSnapshots("live")).find(
      (item) => item.pinned,
    );
    expect(original?.raw).toBe(result.source!.raw);
    expect(original?.rejected?.[0].raw).toEqual(corrupt);
    expect(
      await repository.commit("live", 1, { data: journal() }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
  });

  it("refuses ordinary exports and history reads with corrupt audit rows", async () => {
    const { repository, name } = repo();
    await repository.loadJournal("live", journal());
    await injectAudit(name, { ...audit(), before: null });
    await expect(repository.exportSnapshot("live")).rejects.toThrow(
      "سابقهٔ اصلاح",
    );
    await expect(repository.auditTrail("live")).rejects.toThrow("سابقهٔ اصلاح");
    expect(
      await repository.commit("live", 1, { data: journal() }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
  });

  it("rechecks current audit integrity inside the write transaction", async () => {
    const { repository, name } = repo();
    await repository.loadJournal("live", journal());
    await injectAudit(name, { ...audit(), after: null });
    expect(
      await repository.commit("live", 1, {
        data: journal({ trades: [] }),
        replaceAudit: true,
        audit: [],
      }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
    const db = await openDB(name);
    try {
      expect((await db.get("journals", "live")).revision).toBe(1);
      expect(await db.getAll("audit")).toHaveLength(1);
      expect(await db.getAll("trades")).toHaveLength(1);
    } finally {
      db.close();
    }
  });

  it("atomically recovers valid audit rows, quarantines corrupt originals and removes corrupt live rows", async () => {
    const { repository, name } = repo();
    await repository.loadJournal("live", journal());
    const valid = audit();
    await repository.commit("live", 1, { data: journal(), audit: [valid] });
    const corrupt = { ...audit("broken-audit"), before: null };
    await injectAudit(name, corrupt);
    const result = await repository.loadJournal("live", journal());
    expect(
      await repository.recover(
        "live",
        result.revision,
        result.data,
        result.source!,
      ),
    ).toMatchObject({ ok: true, revision: 3 });
    expect(await repository.auditTrail("live")).toEqual([valid]);
    expect((await repository.exportSnapshot("live"))?.auditEvents).toEqual([
      valid,
    ]);
    expect((await repository.loadJournal("live", journal())).status).toBe(
      "ready",
    );
    const original = (await repository.listSnapshots("live")).find(
      (item) => item.pinned,
    );
    expect(JSON.parse(original!.raw!).auditEvents).toEqual(
      [valid, corrupt].sort((a, b) => a.id.localeCompare(b.id)),
    );
    const automatic = (await repository.listSnapshots("live")).find(
      (item) => !item.pinned,
    );
    expect(automatic?.auditEvents).toHaveLength(2);
    expect(
      await repository.restoreSnapshot("live", automatic!.id, 3),
    ).toMatchObject({ ok: false, reason: "validation" });
  });

  it("rolls back audit cleanup and recovered records if the final write hits quota", async () => {
    const { repository, name } = repo();
    await repository.loadJournal("live", journal());
    const corrupt = { ...audit(), before: null };
    await injectAudit(name, corrupt);
    const result = await repository.loadJournal("live", journal());
    const put = IDBObjectStore.prototype.put;
    const failure = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(function (this: IDBObjectStore, value, key) {
        if (this.name === "journals")
          throw new DOMException("Storage quota full", "QuotaExceededError");
        return put.call(this, value, key);
      });
    expect(
      await repository.recover(
        "live",
        1,
        journal({ trades: [] }),
        result.source!,
      ),
    ).toMatchObject({ ok: false, reason: "quota" });
    failure.mockRestore();
    const db = await openDB(name);
    try {
      expect((await db.get("journals", "live")).revision).toBe(1);
      expect(await db.getAll("trades")).toHaveLength(1);
      expect(await db.getAll("audit")).toEqual([corrupt]);
    } finally {
      db.close();
    }
    expect(
      await repository.commit("live", 1, { data: journal() }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
  });

  it("migrates valid audit history from a document and quarantines malformed audit lists", async () => {
    const { repository } = repo();
    const source = {
      key: "legacy",
      raw: JSON.stringify({ ...journal(), auditEvents: [audit()] }),
    };
    expect(
      (await repository.loadJournal("live", journal({ trades: [] }), source))
        .status,
    ).toBe("ready");
    expect(await repository.auditTrail("live")).toEqual([audit()]);
    const other = repo().repository;
    const bad = {
      key: "legacy",
      raw: JSON.stringify({ ...journal(), auditEvents: { bad: true } }),
    };
    const preview = await other.loadJournal(
      "live",
      journal({ trades: [] }),
      bad,
    );
    expect(preview.status).toBe("recovery-required");
    expect(preview.rejected[0].raw).toEqual({ bad: true });
    expect(await other.recover("live", 0, preview.data, bad)).toMatchObject({
      ok: true,
    });
    expect(await other.auditTrail("live")).toEqual([]);
  });

  it("requires valid backup audits to replace an existing history", async () => {
    const { repository } = repo();
    await repository.loadJournal("live", journal());
    await repository.commit("live", 1, { data: journal(), audit: [audit()] });
    const preview = repository.previewImport(journal(), "live", 2);
    preview.auditEvents = [
      { ...audit("invalid"), before: null } as unknown as AuditEvent,
    ];
    expect(await repository.commitImport(preview)).toMatchObject({
      ok: false,
      reason: "validation",
    });
    expect(await repository.auditTrail("live")).toEqual([audit()]);
    preview.auditEvents = [audit("restored")];
    expect(await repository.commitImport(preview)).toMatchObject({ ok: true });
    expect((await repository.auditTrail("live"))[0].id).toBe("restored");
  });
});

describe("malformed stored image-reference recovery", () => {
  it.each(["replace", "recover"])(
    "repairs corrupted stored image bytes from a validated %s backup",
    async (behavior) => {
      const { repository, name } = repo();
      const blob = new Blob(["original"], { type: "image/png" });
      const asset = {
        id: "img-repair",
        name: "repair.png",
        type: blob.type,
        size: blob.size,
        width: 1,
        height: 1,
        blob,
        hash: await hashBytes(blob),
      };
      const data = journal();
      data.trades[0].images = [asset];
      expect(
        await repository.commit("live", 0, { data, assets: [asset] }),
      ).toMatchObject({ ok: true });
      const db = await openDB(name);
      await db.put("assets", {
        ...asset,
        blob: new Blob(["corrupt!"], { type: blob.type }),
      });
      db.close();
      const restored =
        behavior === "replace"
          ? await repository.commitImport(
              repository.previewImport(data, "live", 1, [asset]),
            )
          : await repository.recover(
              "live",
              1,
              data,
              { key: "recovery-source", raw: JSON.stringify(data) },
              [asset],
            );
      expect(restored).toMatchObject({ ok: true, revision: 2 });
      const stored = await repository.getAsset(asset.id);
      expect(await stored!.blob.text()).toBe("original");
      expect(await hashBytes(stored!.blob)).toBe(stored!.hash);
    },
  );

  it("still rejects a restored asset with the same ID but a different content identity", async () => {
    const { repository } = repo();
    const blob = new Blob(["original"], { type: "image/png" });
    const original = {
      id: "img-identity",
      name: "original.png",
      type: blob.type,
      size: blob.size,
      width: 1,
      height: 1,
      blob,
      hash: await hashBytes(blob),
    };
    const data = journal();
    data.trades[0].images = [original];
    await repository.commit("live", 0, { data, assets: [original] });
    const otherBlob = new Blob(["other!!!"], { type: blob.type });
    const conflicting = {
      ...original,
      blob: otherBlob,
      hash: await hashBytes(otherBlob),
    };
    const result = await repository.commitImport(
      repository.previewImport(data, "live", 1, [conflicting]),
    );
    expect(result).toMatchObject({ ok: false, reason: "validation" });
    expect((await repository.exportSnapshot("live"))?.revision).toBe(1);
    expect(await (await repository.getAsset(original.id))!.blob.text()).toBe(
      "original",
    );
  });

  it.each([{ bad: true }, [null], ["image"], [{ id: null }]])(
    "captures malformed image references %j without losing raw recovery access",
    async (images) => {
      const { repository, name } = repo();
      await repository.loadJournal("live", journal());
      const db = await openDB(name);
      const corrupt = { ...journal().trades[0], images };
      await db.put("trades", { mode: "live", id: corrupt.id, data: corrupt });
      db.close();
      const result = await repository.loadJournal(
        "live",
        journal({ trades: [] }),
      );
      expect(result.status).toBe("recovery-required");
      expect(result.revision).toBe(1);
      expect(JSON.parse(result.source!.raw).trades[0].images).toEqual(images);
      expect((await repository.listSnapshots("live"))[0].raw).toBe(
        result.source!.raw,
      );
      await expect(repository.collectAssets()).resolves.toBeUndefined();
    },
  );

  it("still diagnoses malformed references if an intact checksum skips trade normalization", async () => {
    const { repository, name } = repo();
    await repository.loadJournal("live", journal());
    const data = journal();
    data.trades[0].images = { bad: true } as never;
    const db = await openDB(name);
    await db.put("trades", {
      mode: "live",
      id: data.trades[0].id,
      data: data.trades[0],
    });
    const meta = await db.get("journals", "live");
    await db.put("journals", { ...meta, checksum: await journalHash(data) });
    db.close();
    const result = await repository.loadJournal("live", journal());
    expect(result.status).toBe("recovery-required");
    expect(result.source?.raw).toContain('"bad":true');
    expect(result.rejected.length).toBeGreaterThan(0);
    expect(result.data.trades).toEqual([]);
  });

  it.each(["array-with-invalid-entry", "single-metadata-object"])(
    "preserves known assets referenced by a malformed image container (%s)",
    async (shape) => {
      const { repository, name } = repo();
      const blob = new Blob(["fixture"], { type: "image/png" });
      const asset = {
        id: "img-preserved",
        name: "fixture.png",
        type: blob.type,
        size: blob.size,
        width: 1,
        height: 1,
        blob,
        hash: await hashBytes(blob),
      };
      const data = journal();
      data.trades[0].images = [asset];
      expect(
        await repository.commit("live", 0, { data, assets: [asset] }),
      ).toMatchObject({ ok: true });
      const db = await openDB(name);
      const corrupt = {
        ...data.trades[0],
        images: shape === "single-metadata-object" ? asset : [null, asset],
      };
      await db.put("trades", { mode: "live", id: corrupt.id, data: corrupt });
      db.close();
      const result = await repository.loadJournal(
        "live",
        journal({ trades: [] }),
      );
      expect(result.status).toBe("recovery-required");
      expect((await repository.listSnapshots("live"))[0].assetIds).toContain(
        asset.id,
      );
      await repository.collectAssets();
      expect(await repository.getAsset(asset.id)).toBeDefined();
    },
  );
});
