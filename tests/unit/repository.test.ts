import { afterEach, describe, expect, it } from "vitest";
import { JournalRepository, hashBytes } from "../../src/persistence/repository";
import { canonicalTrade } from "../../src/domain/economics";
import { journal, normalize, rawTrade } from "../fixtures/journal";
import type { ImageAsset } from "../../src/domain/types";

const repositories: JournalRepository[] = [];
function repo(name = crypto.randomUUID()) {
  const value = new JournalRepository(normalize, name);
  repositories.push(value);
  return value;
}
afterEach(async () => {
  await Promise.all(
    repositories.splice(0).map((repository) => repository.close()),
  );
});
async function image(id = "img-test"): Promise<ImageAsset> {
  const blob = new Blob(["synthetic"], { type: "image/png" });
  return {
    id,
    name: "test.png",
    blob,
    hash: await hashBytes(blob),
    size: blob.size,
    type: blob.type,
    width: 1,
    height: 1,
  };
}
describe("transactional journal repository", () => {
  it("distinguishes absent journals from committed empty journals without a full export", async () => {
    const repository = repo();
    expect(await repository.hasJournal("live")).toBe(false);
    expect(await repository.hasJournal("demo")).toBe(false);
    expect(
      await repository.commit("live", 0, { data: journal({ trades: [] }) }),
    ).toMatchObject({ ok: true });
    expect(await repository.hasJournal("live")).toBe(true);
    expect(await repository.hasJournal("demo")).toBe(false);
    expect((await repository.exportSnapshot("live"))?.data.trades).toEqual([]);
  });
  it("requires explicit acceptance after a healthy legacy migration preview", async () => {
    const repository = repo(),
      source = { key: "legacy", raw: JSON.stringify(journal({ version: 11 })) };
    const preview = await repository.loadJournal(
      "live",
      journal({ trades: [] }),
      source,
      [],
      true,
    );
    expect(preview).toMatchObject({
      status: "recovery-required",
      migrationRequired: true,
      rejected: [],
    });
    expect(await repository.exportSnapshot("live")).toBeNull();
    expect(
      await repository.commit("live", 0, { data: journal() }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
    expect(
      await repository.recover("live", 0, preview.data, source),
    ).toMatchObject({ ok: true });
    expect((await repository.listSnapshots("live"))[0].raw).toBe(source.raw);
  });
  it("creates separate live and demo journals and reloads decimal data", async () => {
    const repository = repo();
    expect(
      (await repository.loadJournal("live", journal({ trades: [] }))).status,
    ).toBe("empty");
    expect((await repository.loadJournal("demo", journal())).status).toBe(
      "ready",
    );
    expect((await repository.exportSnapshot("live"))?.data.trades).toHaveLength(
      0,
    );
    expect((await repository.loadJournal("demo", journal())).revision).toBe(1);
    expect(
      (await repository.exportSnapshot("demo"))?.data.trades[0].entry,
    ).toBe("100");
  });
  it.each(Array.from({ length: 11 }, (_, index) => index + 1))(
    "migrates version %i with one exact recovery snapshot",
    async (version) => {
      const repository = repo(),
        raw = JSON.stringify(journal({ version })),
        source = { key: "edge-journal:v3", raw };
      expect(
        (await repository.loadJournal("live", journal({ trades: [] }), source))
          .status,
      ).toBe("ready");
      await repository.preserveSource("live", source);
      await repository.loadJournal("live", journal(), source);
      const snapshots = await repository.listSnapshots("live");
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].raw).toBe(raw);
      expect((await repository.exportSnapshot("live"))?.data.version).toBe(13);
    },
  );
  it("blocks every ordinary write after malformed JSON and retains the bytes", async () => {
    const repository = repo(),
      source = { key: "edge-journal:v3", raw: "{broken" };
    expect(
      (await repository.loadJournal("live", journal({ trades: [] }), source))
        .status,
    ).toBe("recovery-required");
    expect(
      await repository.commit("live", 0, { data: journal() }),
    ).toMatchObject({ ok: false, reason: "recovery-required" });
    expect((await repository.listSnapshots("live"))[0].raw).toBe(source.raw);
    expect(await repository.exportSnapshot("live")).toBeNull();
  });
  it("quarantines invalid and duplicate trades before migration", async () => {
    const repository = repo(),
      raw = JSON.stringify(
        journal({
          version: 11,
          trades: [
            rawTrade(),
            rawTrade(),
            rawTrade({ id: "invalid", quantity: 0 }),
          ],
        }),
      );
    const result = await repository.loadJournal(
      "live",
      journal({ trades: [] }),
      { key: "legacy", raw },
    );
    expect(result.status).toBe("recovery-required");
    expect(result.data.trades).toHaveLength(1);
    expect(result.rejected).toHaveLength(2);
    expect((await repository.listSnapshots("live"))[0].rejected).toEqual(
      result.rejected,
    );
    expect(await repository.exportSnapshot("live")).toBeNull();
  });
  it("rejects unsupported versions without writing a journal", async () => {
    const repository = repo(),
      raw = JSON.stringify(journal({ version: 999 }));
    expect(
      (await repository.loadJournal("live", journal(), { key: "legacy", raw }))
        .status,
    ).toBe("unsupported-version");
    expect(await repository.exportSnapshot("live")).toBeNull();
  });
  it("recovers only after preserving the original", async () => {
    const repository = repo(),
      source = { key: "legacy", raw: "{broken" };
    await repository.loadJournal("live", journal({ trades: [] }), source);
    expect(
      await repository.recover("live", 0, journal(), source),
    ).toMatchObject({ ok: true, revision: 1 });
    expect((await repository.loadJournal("live", journal())).status).toBe(
      "ready",
    );
    expect(await repository.listSnapshots("live")).toHaveLength(1);
  });
  it("serializes concurrent revisions without lost updates", async () => {
    const name = crypto.randomUUID(),
      first = repo(name),
      second = repo(name);
    await first.loadJournal("live", journal());
    const results = await Promise.all([
      first.commit("live", 1, {
        data: journal({ settings: { currency: "USD", changed: 1 } }),
      }),
      second.commit("live", 1, {
        data: journal({ settings: { currency: "USD", changed: 2 } }),
      }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect((await first.exportSnapshot("live"))?.revision).toBe(2);
  });
  it("does not partially save records if an image is missing", async () => {
    const repository = repo();
    await repository.loadJournal("live", journal());
    const data = journal();
    data.trades[0].images = [
      {
        id: "img-missing",
        name: "x",
        type: "image/png",
        size: 1,
        width: 1,
        height: 1,
      },
    ];
    expect((await repository.commit("live", 1, { data })).ok).toBe(false);
    expect((await repository.exportSnapshot("live"))?.revision).toBe(1);
    expect(
      (await repository.exportSnapshot("live"))?.data.trades[0].images,
    ).toEqual([]);
  });
  it("refuses inconsistent image-reference metadata before migration and within commits", async () => {
    const repository = repo(),
      asset = await image(),
      data = journal();
    data.trades[0].images = [{ ...asset, width: 2 }];
    const source = {
      key: "legacy",
      raw: JSON.stringify({ ...data, version: 11 }),
    };
    expect(
      (
        await repository.loadJournal("live", journal({ trades: [] }), source, [
          asset,
        ])
      ).status,
    ).toBe("recovery-required");
    const fresh = repo();
    await fresh.loadJournal("live", journal());
    expect((await fresh.commit("live", 1, { data, assets: [asset] })).ok).toBe(
      false,
    );
    expect((await fresh.exportSnapshot("live"))?.revision).toBe(1);
  });
  it("atomically imports images and rejects conflicting identities", async () => {
    const repository = repo(),
      asset = await image(),
      data = journal();
    data.trades[0].images = [asset];
    expect(
      (await repository.commit("live", 0, { data, assets: [asset] })).ok,
    ).toBe(true);
    const conflict = await image();
    conflict.blob = new Blob(["other"], { type: "image/png" });
    conflict.hash = await hashBytes(conflict.blob);
    expect(
      (await repository.commit("live", 1, { data, assets: [conflict] })).ok,
    ).toBe(false);
    expect((await repository.getAsset(asset.id))?.hash).toBe(asset.hash);
  });
  it("removes abandoned images and retains shared journal references", async () => {
    const repository = repo(),
      asset = await image();
    await repository.stageAsset(asset, {
      id: "draft",
      mode: "live",
      payload: {},
      assetIds: [asset.id],
      updatedAt: "",
    });
    await repository.collectAssets();
    expect(await repository.getAsset(asset.id)).toBeDefined();
    await repository.removeDraft("draft");
    expect(await repository.getAsset(asset.id)).toBeUndefined();
    const data = journal();
    data.trades[0].images = [asset];
    await repository.commit("demo", 0, { data, assets: [asset] });
    await repository.commit("live", 0, { data, assets: [asset] });
    await repository.commit("live", 1, { data: journal({ trades: [] }) });
    await repository.collectAssets();
    expect(await repository.getAsset(asset.id)).toBeDefined();
  });
  it("retains images in snapshots and prunes automatic snapshots to three", async () => {
    const repository = repo(),
      asset = await image(),
      data = journal();
    data.trades[0].images = [asset];
    await repository.commit("live", 0, { data, assets: [asset] });
    await repository.commit("live", 1, {
      data: journal({ trades: [] }),
      destructive: true,
    });
    await repository.collectAssets();
    expect(await repository.getAsset(asset.id)).toBeDefined();
    for (let revision = 2; revision < 6; revision++)
      await repository.commit("live", revision, {
        data: journal({ trades: [] }),
        destructive: true,
      });
    expect(
      (await repository.listSnapshots("live")).filter(
        (snapshot) => !snapshot.pinned,
      ),
    ).toHaveLength(3);
    for (const snapshot of await repository.listSnapshots("live"))
      await repository.deleteSnapshot(snapshot.id);
    expect(await repository.getAsset(asset.id)).toBeUndefined();
  });
  it("previews imports without mutation and checks the revision at acceptance", async () => {
    const repository = repo();
    await repository.loadJournal("live", journal());
    const data = journal({
      trades: [canonicalTrade(rawTrade({ id: "next" }), "USD")],
    });
    const preview = repository.previewImport(data, "live", 1);
    expect((await repository.exportSnapshot("live"))?.revision).toBe(1);
    await repository.commit("live", 1, { data: journal() });
    expect(await repository.commitImport(preview)).toMatchObject({
      ok: false,
      reason: "revision-conflict",
    });
  });
  it("rejects invalid previews and duplicate append imports", async () => {
    const repository = repo();
    await repository.loadJournal("live", journal());
    const invalid = repository.previewImport(
      journal({ trades: [rawTrade({ quantity: 0 })] }),
      "live",
      1,
    );
    expect(await repository.commitImport(invalid)).toMatchObject({
      ok: false,
      reason: "validation",
    });
    expect(
      await repository.commitImport(
        repository.previewImport(journal(), "live", 1, [], "append"),
      ),
    ).toMatchObject({ ok: false, reason: "validation" });
  });
});
