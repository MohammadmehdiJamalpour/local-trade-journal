import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import { inspectAudit } from "../domain/boundaries";
import type {
  AuditEvent,
  CommitResult,
  ImageAsset,
  ImageReference,
  JournalData,
  JournalMode,
  LoadResult,
  RejectedRecord,
  TradeRecord,
} from "../domain/types";

export const DOCUMENT_VERSION = 13;
export const DATABASE_VERSION = 1;
export const DATABASE_NAME = "edge-journal";
const STORES = [
  "journals",
  "accounts",
  "catalogs",
  "trades",
  "assets",
  "drafts",
  "audit",
  "snapshots",
] as const;
interface Meta {
  mode: JournalMode;
  version: number;
  revision: number;
  settings: JournalData["settings"];
  updatedAt: string;
  checksum?: string;
}
interface Snapshot {
  id: string;
  mode: JournalMode;
  pinned: boolean;
  createdAt: string;
  sourceKey?: string;
  raw?: string;
  data?: JournalData;
  assetIds: string[];
  hash?: string;
  auditEvents?: AuditEvent[];
  rejected?: RejectedRecord[];
}
export interface Draft {
  id: string;
  mode: JournalMode;
  payload: unknown;
  assetIds: string[];
  updatedAt: string;
  generation?: number;
}
type StoredAsset = Omit<ImageAsset, "blob"> & { blob: Blob | ArrayBuffer };
const readAsset = (asset: StoredAsset): ImageAsset => ({
  ...asset,
  blob:
    asset.blob instanceof Blob
      ? asset.blob
      : new Blob([asset.blob], { type: asset.type }),
});
const blobStorageFailure = (error: unknown) =>
  error instanceof Error &&
  /preparing Blob\/File data|Blob.*(?:not supported|not be cloned)/i.test(
    error.message,
  );
interface Database extends DBSchema {
  journals: { key: JournalMode; value: Meta };
  accounts: {
    key: [JournalMode, string];
    value: {
      mode: JournalMode;
      id: string;
      data: JournalData["accounts"][number];
    };
    indexes: { mode: JournalMode };
  };
  catalogs: {
    key: [JournalMode, string];
    value: { mode: JournalMode; id: string; data: unknown[] };
    indexes: { mode: JournalMode };
  };
  trades: {
    key: [JournalMode, string];
    value: { mode: JournalMode; id: string; data: TradeRecord };
    indexes: { mode: JournalMode };
  };
  assets: { key: string; value: StoredAsset };
  drafts: { key: string; value: Draft; indexes: { mode: JournalMode } };
  audit: { key: string; value: AuditEvent; indexes: { mode: JournalMode } };
  snapshots: { key: string; value: Snapshot; indexes: { mode: JournalMode } };
}
export type Normalizer = (raw: unknown) => {
  data: JournalData;
  rejected: RejectedRecord[];
};
export interface ImportPreview {
  mode: JournalMode;
  data: JournalData;
  assets: ImageAsset[];
  rejected: RejectedRecord[];
  expectedRevision: number;
  behavior: "replace" | "append";
  raw?: string;
  sourceKey?: string;
  auditEvents?: AuditEvent[];
}
export type JournalCommand = {
  data: JournalData;
  assets?: ImageAsset[];
  audit?: AuditEvent[];
  replaceAudit?: boolean;
  destructive?: boolean;
  recover?: boolean;
  source?: { key: string; raw: string };
};
const imageReferenceIds = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).flatMap((image: unknown) =>
    image &&
    typeof image === "object" &&
    "id" in image &&
    typeof image.id === "string"
      ? [image.id]
      : [],
  );
const references = (data: JournalData) => [
  ...new Set(
    data.trades.flatMap((trade) =>
      trade ? imageReferenceIds(trade.images) : [],
    ),
  ),
];
export const assetMatches = (
  image: ImageReference,
  asset?: Pick<ImageAsset, "id" | "type" | "size" | "width" | "height">,
) =>
  Boolean(
    image &&
    asset &&
    image.id === asset.id &&
    image.type === asset.type &&
    image.size === asset.size &&
    image.width === asset.width &&
    image.height === asset.height,
  );
const invalidImages = (data: JournalData, assets: ImageAsset[]) =>
  data.trades.flatMap((trade) => {
    if (!trade || (trade.images != null && !Array.isArray(trade.images)))
      return ["مرجع تصویر نامعتبر"];
    return (trade.images || [])
      .filter(
        (image) =>
          !image ||
          !assetMatches(
            image,
            assets.find((asset) => asset.id === image.id),
          ),
      )
      .map((image) => image?.id || "مرجع تصویر نامعتبر");
  });
const inspectDocumentAudit = (value: unknown, mode: JournalMode) =>
  value === undefined
    ? { accepted: [], rejected: [] }
    : Array.isArray(value)
      ? inspectAudit(value, mode)
      : {
          accepted: [],
          rejected: [
            {
              index: -1,
              raw: value,
              reasons: ["فهرست سوابق اصلاح معتبر نیست."],
            },
          ],
        };
const auditReasons = (rejected: RejectedRecord[]) =>
  rejected.flatMap((row) => row.reasons).join("؛ ");
const isQuota = (error: unknown) =>
  error instanceof Error &&
  (error.name === "QuotaExceededError" || /quota/i.test(error.message));
export async function hashBytes(value: string | Blob): Promise<string> {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : await value.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function journalHash(data: JournalData) {
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return hashBytes(
    JSON.stringify({
      version: data.version,
      settings: data.settings,
      accounts: [...data.accounts].sort((a, b) => compare(a.id, b.id)),
      options: Object.fromEntries(
        Object.entries(data.options).sort(([a], [b]) => compare(a, b)),
      ),
      trades: [...data.trades].sort((a, b) => compare(a.id, b.id)),
    }),
  );
}
export class JournalRepository {
  private database?: Promise<IDBPDatabase<Database>>;
  private blocked = new Set<JournalMode>();
  private channel?: BroadcastChannel;
  private binaryAssetFallback = false;
  private listeners = new Set<(mode: JournalMode, revision: number) => void>();
  constructor(
    private normalize: Normalizer,
    private name = DATABASE_NAME,
  ) {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(name + ":revisions");
      this.channel.onmessage = (event) => {
        const message = event.data as { mode?: JournalMode; revision?: number };
        if (
          (message.mode === "live" || message.mode === "demo") &&
          typeof message.revision === "number"
        )
          this.listeners.forEach((listener) =>
            listener(message.mode!, message.revision!),
          );
      };
    }
  }
  subscribe(listener: (mode: JournalMode, revision: number) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private db() {
    if (!this.database) {
      let rejectBlocked: (reason: Error) => void;
      let refused = false;
      const blocked = new Promise<never>((_resolve, reject) => {
        rejectBlocked = reject;
      });
      const opening = openDB<Database>(this.name, DATABASE_VERSION, {
        upgrade(db) {
          db.createObjectStore("journals", { keyPath: "mode" });
          for (const name of ["accounts", "catalogs", "trades"] as const)
            db.createObjectStore(name, { keyPath: ["mode", "id"] }).createIndex(
              "mode",
              "mode",
            );
          db.createObjectStore("assets", { keyPath: "id" });
          for (const name of ["drafts", "audit", "snapshots"] as const)
            db.createObjectStore(name, { keyPath: "id" }).createIndex(
              "mode",
              "mode",
            );
        },
        blocked: () => {
          refused = true;
          globalThis.dispatchEvent?.(
            new CustomEvent("edge-storage-status", { detail: "blocked" }),
          );
          rejectBlocked(
            new Error(
              "ارتقای پایگاه داده در تب دیگری قفل است؛ تب‌های قدیمی را ببند و صفحه را تازه‌سازی کن.",
            ),
          );
        },
        blocking: () => {
          void this.close();
        },
        terminated: () => {
          this.database = undefined;
          globalThis.dispatchEvent?.(
            new CustomEvent("edge-storage-status", { detail: "terminated" }),
          );
        },
      });
      void opening.then(
        (db) => {
          if (refused) db.close();
        },
        () => undefined,
      );
      this.database = Promise.race([opening, blocked]).catch((error) => {
        this.database = undefined;
        throw error;
      });
    }
    return this.database;
  }
  async close() {
    this.channel?.close();
    const database = this.database;
    this.database = undefined;
    if (database) (await database).close();
  }
  /** Presence is a metadata lookup; loading still validates the complete saved revision. */
  async hasJournal(mode: JournalMode): Promise<boolean> {
    const db = await this.db();
    return (await db.getKey("journals", mode)) !== undefined;
  }
  async loadJournal(
    mode: JournalMode,
    fallback: JournalData,
    legacy?: { key: string; raw: string },
    assets: ImageAsset[] = [],
    previewMigration = false,
  ): Promise<LoadResult> {
    let recoveredRevision = 0;
    let readable = fallback,
      recoverySource = legacy;
    try {
      const current = await this.exportSnapshot(mode, true);
      if (current) {
        recoveredRevision = current.revision;
        readable = current.data;
        recoverySource = {
          key: "indexeddb:" + mode,
          raw: JSON.stringify({
            ...current.data,
            auditEvents: current.rawAuditEvents || current.auditEvents,
          }),
        };
        if (current.data.version > DOCUMENT_VERSION) {
          this.blocked.add(mode);
          return {
            status: "unsupported-version",
            ...current,
            source: recoverySource,
            rejected: [],
            error: "نسخهٔ این ژورنال جدیدتر از برنامه است.",
          };
        }
        // Revalidate economic rules only when stored bytes differ from the validated committed revision.
        // The checksum detects accidental corruption; it is not an authentication boundary.
        let intact = false;
        try {
          intact = Boolean(
            current.checksum &&
            current.checksum === (await journalHash(current.data)),
          );
        } catch {
          /* Corrupt values still reach quarantine and raw recovery. */
        }
        const readableImageLists = current.data.trades.every(
          (trade) =>
            trade &&
            Array.isArray(trade.images) &&
            trade.images.every(
              (image) => image && typeof image.id === "string",
            ),
        );
        const validation =
          intact && readableImageLists
            ? { data: current.data, rejected: [] as RejectedRecord[] }
            : this.normalize(current.data);
        validation.rejected.push(...(current.auditRejected || []));
        const missing = invalidImages(validation.data, current.assets);
        if (missing.length)
          validation.rejected.push({
            index: -1,
            raw: missing,
            reasons: ["تصویر مرجع در ذخیره‌سازی موجود نیست."],
          });
        if (validation.rejected.length) {
          this.blocked.add(mode);
          await this.preserveSource(mode, recoverySource, validation.rejected);
          return {
            status: "recovery-required",
            data: validation.data,
            revision: current.revision,
            rejected: validation.rejected,
            source: recoverySource,
          };
        }
        return {
          status: "ready",
          ...current,
          data: validation.data,
          rejected: [],
        };
      }
      if (legacy) {
        let parsed: { version?: number; auditEvents?: unknown };
        try {
          parsed = JSON.parse(legacy.raw) as {
            version?: number;
            auditEvents?: unknown;
          };
        } catch {
          this.blocked.add(mode);
          await this.preserveSource(mode, legacy);
          return {
            status: "recovery-required",
            data: fallback,
            revision: 0,
            rejected: [
              {
                index: -1,
                raw: legacy.raw,
                reasons: ["JSON ذخیره‌شده خوانده نشد."],
              },
            ],
            source: legacy,
          };
        }
        if (
          !Number.isInteger(parsed?.version) ||
          Number(parsed.version) > DOCUMENT_VERSION ||
          Number(parsed.version) < 1
        ) {
          this.blocked.add(mode);
          await this.preserveSource(mode, legacy);
          return {
            status: "unsupported-version",
            data: fallback,
            revision: 0,
            rejected: [],
            source: legacy,
          };
        }
        const validation = this.normalize(parsed);
        const audit = inspectDocumentAudit(parsed.auditEvents, mode);
        validation.rejected.push(...audit.rejected);
        readable = validation.data;
        const missing = invalidImages(validation.data, assets);
        if (missing.length)
          validation.rejected.push({
            index: -1,
            raw: missing,
            reasons: ["تصاویر سابقه در مرورگر پیدا نشد؛ منبع اصلی حفظ شد."],
          });
        await this.preserveSource(mode, legacy, validation.rejected);
        if (validation.rejected.length) {
          this.blocked.add(mode);
          return {
            status: "recovery-required",
            data: validation.data,
            revision: 0,
            rejected: validation.rejected,
            source: legacy,
          };
        }
        if (previewMigration) {
          this.blocked.add(mode);
          return {
            status: "recovery-required",
            data: validation.data,
            revision: 0,
            rejected: [],
            source: legacy,
            migrationRequired: true,
          };
        }
        const committed = await this.commit(mode, 0, {
          data: validation.data,
          assets,
          audit: audit.accepted,
        });
        if (!committed.ok) {
          this.blocked.add(mode);
          return {
            status: "storage-unavailable",
            data: validation.data,
            revision: 0,
            rejected: [],
            source: legacy,
            error: committed.message,
          };
        }
        const verified = await this.exportSnapshot(mode);
        if (
          !verified ||
          verified.data.trades.length !== validation.data.trades.length
        )
          throw new Error("تأیید مهاجرت کامل نشد.");
        return { status: "ready", ...verified, rejected: [] };
      }
      const result = await this.commit(mode, 0, { data: fallback, assets });
      if (!result.ok) throw new Error(result.message);
      return {
        status: fallback.trades.length ? "ready" : "empty",
        data: result.data,
        revision: result.revision,
        rejected: [],
      };
    } catch (error) {
      this.blocked.add(mode);
      if (recoverySource && readable === fallback)
        try {
          readable = this.normalize(JSON.parse(recoverySource.raw)).data;
        } catch {
          /* Raw source remains downloadable. */
        }
      return {
        status: "storage-unavailable",
        data: readable,
        revision: recoveredRevision,
        rejected: [],
        source: recoverySource,
        error:
          error instanceof Error ? error.message : "ذخیره‌سازی در دسترس نیست.",
      };
    }
  }
  async preserveSource(
    mode: JournalMode,
    source: { key: string; raw: string },
    rejected: RejectedRecord[] = [],
  ) {
    const hash = await hashBytes(source.raw),
      id = "source:" + mode + ":" + hash;
    const db = await this.db();
    let assetIds: string[] = [];
    try {
      const parsed = JSON.parse(source.raw) as JournalData;
      if (Array.isArray(parsed.trades)) assetIds = references(parsed);
    } catch {
      /* Exact raw recovery still works when the payload is unreadable. */
    }
    const existing = await db.get("snapshots", id);
    if (!existing)
      await db.put("snapshots", {
        id,
        mode,
        pinned: true,
        createdAt: new Date().toISOString(),
        sourceKey: source.key,
        raw: source.raw,
        hash,
        assetIds,
        rejected,
      });
    return id;
  }
  async exportSnapshot(
    mode: JournalMode,
    allowMissingAssets = false,
  ): Promise<{
    data: JournalData;
    revision: number;
    assets: ImageAsset[];
    auditEvents: AuditEvent[];
    rawAuditEvents?: unknown[];
    auditRejected?: RejectedRecord[];
    checksum?: string;
  } | null> {
    const db = await this.db(),
      tx = db.transaction(
        ["journals", "accounts", "catalogs", "trades", "assets", "audit"],
        "readonly",
      );
    void tx.done.catch(() => undefined);
    const meta = await tx.objectStore("journals").get(mode);
    if (!meta) {
      await tx.done;
      return null;
    }
    // Queue independent reads together while retaining one consistent transaction.
    const [accountRows, catalogRows, tradeRows, auditEvents] =
      await Promise.all([
        tx.objectStore("accounts").index("mode").getAll(mode),
        tx.objectStore("catalogs").index("mode").getAll(mode),
        tx.objectStore("trades").index("mode").getAll(mode),
        tx.objectStore("audit").index("mode").getAll(mode),
      ]);
    const accounts = accountRows.map((row) => row.data);
    const options = Object.fromEntries(
      catalogRows.map((row) => [row.id, row.data]),
    );
    const trades = tradeRows.map((row) => row.data);
    const data = {
      version: meta.version,
      settings: meta.settings,
      accounts,
      options,
      trades,
    };
    const assets: ImageAsset[] = [];
    const assetIds = [...references(data)];
    const assetRows = await Promise.all(
      assetIds.map((id) => tx.objectStore("assets").get(id)),
    );
    for (const [index, asset] of assetRows.entries()) {
      if (!asset) {
        if (allowMissingAssets) continue;
        tx.abort();
        throw new Error(
          "تصویر مرجع در ذخیره‌سازی موجود نیست: " + assetIds[index],
        );
      }
      assets.push(readAsset(asset));
    }
    await tx.done;
    const audit = inspectAudit(auditEvents, mode);
    if (audit.rejected.length && !allowMissingAssets) {
      this.blocked.add(mode);
      throw new Error(
        "سابقهٔ اصلاح آسیب دیده است؛ ابتدا بازیابی را بررسی کن: " +
          auditReasons(audit.rejected),
      );
    }
    return {
      data,
      revision: meta.revision,
      assets,
      auditEvents: audit.accepted,
      ...(allowMissingAssets
        ? { rawAuditEvents: auditEvents, auditRejected: audit.rejected }
        : {}),
      checksum: meta.checksum,
    };
  }
  async commit(
    mode: JournalMode,
    expectedRevision: number,
    command: JournalCommand,
  ): Promise<CommitResult> {
    if (this.blocked.has(mode) && !command.recover)
      return {
        ok: false,
        reason: "recovery-required",
        message: "ابتدا بازیابی ژورنال را کامل کن؛ منبع اصلی تغییر نکرده است.",
      };
    let data: JournalData;
    let abortPending: (() => void) | undefined;
    try {
      const validation = this.normalize(command.data);
      if (validation.rejected.length)
        return {
          ok: false,
          reason: "validation",
          message: validation.rejected.flatMap((row) => row.reasons).join("؛ "),
        };
      const audit = inspectAudit(command.audit || [], mode);
      if (audit.rejected.length)
        return {
          ok: false,
          reason: "validation",
          message: "سابقهٔ اصلاح معتبر نیست: " + auditReasons(audit.rejected),
        };
      data = { ...validation.data, version: DOCUMENT_VERSION };
      const checksum = await journalHash(data);
      if (command.source) await this.preserveSource(mode, command.source);
      // Hashing and validation happen before the transaction so it cannot auto-close between unrelated awaits.
      for (const asset of command.assets || []) {
        if (asset.hash !== (await hashBytes(asset.blob)))
          return {
            ok: false,
            reason: "validation",
            message: "محتوای تصویر با هش آن سازگار نیست.",
          };
      }
      const assets: StoredAsset[] = await Promise.all(
        (command.assets || []).map(async (asset) => ({
          ...asset,
          blob: this.binaryAssetFallback
            ? await asset.blob.arrayBuffer()
            : asset.blob,
        })),
      );
      const db = await this.db(),
        tx = db.transaction(STORES, "readwrite", { durability: "strict" });
      void tx.done.catch(() => undefined);
      abortPending = () => {
        try {
          tx.abort();
        } catch {
          /* Already committed or aborted. */
        }
      };
      const current = await tx.objectStore("journals").get(mode);
      if ((current?.revision ?? 0) !== expectedRevision) {
        tx.abort();
        await tx.done.catch(() => undefined);
        return {
          ok: false,
          reason: "revision-conflict",
          message:
            "ژورنال در تب دیگری تغییر کرده است؛ پیش‌نویس حفظ شد. صفحه را تازه‌سازی کن.",
        };
      }
      const currentAudit = await tx
        .objectStore("audit")
        .index("mode")
        .getAll(mode);
      const existingAudit = inspectAudit(currentAudit, mode);
      if (
        existingAudit.rejected.length &&
        !(command.recover && command.source && command.replaceAudit)
      ) {
        tx.abort();
        await tx.done.catch(() => undefined);
        this.blocked.add(mode);
        return {
          ok: false,
          reason: "recovery-required",
          message:
            "سابقهٔ اصلاح آسیب دیده است؛ ابتدا صفحه را برای بازیابی تازه‌سازی کن.",
        };
      }
      const existingAuditIds = new Set(currentAudit.map((event) => event.id));
      if (
        !command.replaceAudit &&
        audit.accepted.some((event) => existingAuditIds.has(event.id))
      ) {
        tx.abort();
        await tx.done.catch(() => undefined);
        return {
          ok: false,
          reason: "validation",
          message: "سابقهٔ اصلاح ثبت‌شده تغییرپذیر نیست؛ شناسهٔ تازه لازم است.",
        };
      }
      if (command.destructive && current) {
        const oldAccounts = (
          await tx.objectStore("accounts").index("mode").getAll(mode)
        ).map((row) => row.data);
        const oldOptions = Object.fromEntries(
          (await tx.objectStore("catalogs").index("mode").getAll(mode)).map(
            (row) => [row.id, row.data],
          ),
        );
        const oldTrades = (
          await tx.objectStore("trades").index("mode").getAll(mode)
        ).map((row) => row.data);
        const oldData = {
          version: current.version,
          settings: current.settings,
          accounts: oldAccounts,
          options: oldOptions,
          trades: oldTrades,
        };
        const id = "automatic:" + mode + ":" + current.revision;
        await tx.objectStore("snapshots").put({
          id,
          mode,
          pinned: false,
          createdAt: new Date().toISOString(),
          data: oldData,
          assetIds: references(oldData),
          auditEvents: currentAudit,
        });
        const snapshots = (
          await tx.objectStore("snapshots").index("mode").getAll(mode)
        )
          .filter((item) => !item.pinned)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        for (const snapshot of snapshots.slice(3))
          await tx.objectStore("snapshots").delete(snapshot.id);
      }
      for (const asset of assets) {
        const existing = await tx.objectStore("assets").get(asset.id);
        if (
          existing &&
          (existing.hash !== asset.hash ||
            existing.type !== asset.type ||
            existing.width !== asset.width ||
            existing.height !== asset.height)
        ) {
          tx.abort();
          throw new Error("شناسهٔ تصویر با محتوای دیگری تداخل دارد.");
        }
        // An explicitly restored, hash-validated backup also repairs damaged bytes
        // whose stored identity/metadata survived; conflicting identities still fail above.
        if (!existing || command.replaceAudit || command.recover)
          await tx.objectStore("assets").put(asset);
      }
      for (const trade of data.trades)
        for (const image of trade.images || [])
          if (
            !assetMatches(image, await tx.objectStore("assets").get(image.id))
          ) {
            tx.abort();
            throw new Error(
              "تصویر پشتیبان یا معامله موجود نیست یا ناسازگار است: " + image.id,
            );
          }
      const changes = [
        [
          "accounts",
          data.accounts.map((account) => [account.id, account] as const),
        ],
        ["catalogs", Object.entries(data.options)],
        ["trades", data.trades.map((trade) => [trade.id, trade] as const)],
      ] as const;
      for (const [storeName, rows] of changes) {
        const store = tx.objectStore(storeName);
        const existing = await store.index("mode").getAll(mode);
        const next = new Map<string, unknown>(rows),
          existingById = new Map(existing.map((row) => [row.id, row]));
        for (const row of existing)
          if (!next.has(row.id)) await store.delete([mode, row.id]);
        for (const [id, value] of rows) {
          const previous = existingById.get(id);
          if (
            !previous ||
            JSON.stringify(previous.data) !== JSON.stringify(value)
          ) {
            // The discriminated store/row pairing is established by changes above.
            await store.put({ mode, id, data: value } as never);
          }
        }
      }
      if (command.replaceAudit)
        for (const event of currentAudit)
          await tx.objectStore("audit").delete(event.id);
      for (const event of audit.accepted)
        await tx.objectStore("audit").add(event);
      const revision = expectedRevision + 1;
      await tx.objectStore("journals").put({
        mode,
        version: DOCUMENT_VERSION,
        revision,
        settings: data.settings,
        updatedAt: new Date().toISOString(),
        checksum,
      });
      await tx.done;
      abortPending = undefined;
      this.blocked.delete(mode);
      this.channel?.postMessage({ mode, revision });
      try {
        localStorage.setItem(
          "edge-journal:revision",
          JSON.stringify({ mode, revision }),
        );
      } catch {
        /* IndexedDB remains authoritative. */
      }
      return { ok: true, revision, data };
    } catch (error) {
      abortPending?.();
      if (!this.binaryAssetFallback && blobStorageFailure(error)) {
        this.binaryAssetFallback = true;
        return this.commit(mode, expectedRevision, command);
      }
      return {
        ok: false,
        reason: isQuota(error)
          ? "quota"
          : error instanceof Error && /تصویر/.test(error.message)
            ? "validation"
            : "storage-unavailable",
        message:
          error instanceof Error
            ? error.message
            : "ذخیره کامل نشد؛ نسخهٔ قبلی حفظ شد.",
      };
    }
  }
  previewImport(
    raw: unknown,
    mode: JournalMode,
    expectedRevision: number,
    assets: ImageAsset[] = [],
    behavior: "replace" | "append" = "replace",
  ): ImportPreview {
    const validation = this.normalize(raw);
    return { mode, expectedRevision, assets, behavior, ...validation };
  }
  async commitImport(preview: ImportPreview): Promise<CommitResult> {
    if (preview.rejected.length)
      return {
        ok: false,
        reason: "validation",
        message: "پیش‌نمایش شامل رکورد نامعتبر است.",
      };
    let data = preview.data;
    if (preview.behavior === "append") {
      const current = await this.exportSnapshot(preview.mode);
      if (current) {
        const ids = new Set(current.data.trades.map((trade) => trade.id));
        if (data.trades.some((trade) => ids.has(trade.id)))
          return {
            ok: false,
            reason: "validation",
            message: "شناسهٔ معامله تکراری است.",
          };
        data = {
          ...current.data,
          trades: [...current.data.trades, ...data.trades],
        };
      }
    }
    return this.commit(preview.mode, preview.expectedRevision, {
      data,
      assets: preview.assets,
      destructive: true,
      audit: preview.auditEvents,
      replaceAudit: preview.behavior === "replace",
      recover: Boolean(preview.raw && preview.sourceKey),
      source:
        preview.raw && preview.sourceKey
          ? { key: preview.sourceKey, raw: preview.raw }
          : undefined,
    });
  }
  async recover(
    mode: JournalMode,
    expectedRevision: number,
    data: JournalData,
    source: { key: string; raw: string },
    assets: ImageAsset[] = [],
  ) {
    let audit: AuditEvent[] = [];
    try {
      const parsed = JSON.parse(source.raw) as { auditEvents?: unknown } | null;
      audit = inspectDocumentAudit(parsed?.auditEvents, mode).accepted;
    } catch {
      /* An unreadable legacy source has no trusted audit rows; its exact raw bytes are retained. */
    }
    return this.commit(mode, expectedRevision, {
      data,
      assets,
      source,
      audit,
      replaceAudit: true,
      recover: true,
      destructive: true,
    });
  }
  async getAsset(id: string) {
    const asset = await (await this.db()).get("assets", id);
    return asset ? readAsset(asset) : undefined;
  }
  async stageAsset(asset: ImageAsset, draft: Draft): Promise<void> {
    if (asset.hash !== (await hashBytes(asset.blob)))
      throw new Error("هش تصویر نامعتبر است.");
    const stored: StoredAsset = {
      ...asset,
      blob: this.binaryAssetFallback
        ? await asset.blob.arrayBuffer()
        : asset.blob,
    };
    const db = await this.db(),
      tx = db.transaction(["assets", "drafts"], "readwrite");
    void tx.done.catch(() => undefined);
    try {
      const previousDraft = await tx.objectStore("drafts").get(draft.id);
      if (
        draft.generation !== undefined &&
        previousDraft?.generation !== undefined &&
        previousDraft.generation !== draft.generation
      )
        throw new Error("پیش‌نویس تصویر تغییر کرده است.");
      const previous = await tx.objectStore("assets").get(asset.id);
      if (previous && previous.hash !== asset.hash) {
        tx.abort();
        throw new Error("شناسهٔ تصویر تداخل دارد.");
      }
      await tx.objectStore("assets").put(stored);
      await tx.objectStore("drafts").put(draft);
      await tx.done;
    } catch (error) {
      try {
        tx.abort();
      } catch {
        /* The browser already aborted the transaction. */
      }
      if (!this.binaryAssetFallback && blobStorageFailure(error)) {
        this.binaryAssetFallback = true;
        return this.stageAsset(asset, draft);
      }
      throw error;
    }
  }
  async saveDraft(draft: Draft) {
    await (await this.db()).put("drafts", draft);
  }
  async getDraft(id: string) {
    return (await this.db()).get("drafts", id);
  }
  async removeDraft(id: string) {
    await (await this.db()).delete("drafts", id);
    await this.collectAssets();
  }
  async collectAssets() {
    const db = await this.db(),
      tx = db.transaction(
        ["trades", "drafts", "snapshots", "assets"],
        "readwrite",
      );
    const retained = new Set<string>();
    for (const row of await tx.objectStore("trades").getAll())
      references({ trades: [row.data] } as JournalData).forEach((id) =>
        retained.add(id),
      );
    for (const draft of await tx.objectStore("drafts").getAll())
      draft.assetIds.forEach((id) => retained.add(id));
    for (const snapshot of await tx.objectStore("snapshots").getAll())
      snapshot.assetIds.forEach((id) => retained.add(id));
    for (const id of await tx.objectStore("assets").getAllKeys())
      if (!retained.has(id)) await tx.objectStore("assets").delete(id);
    await tx.done;
  }
  async listSnapshots(mode: JournalMode) {
    return (await this.db()).getAllFromIndex("snapshots", "mode", mode);
  }
  async deleteSnapshot(id: string) {
    await (await this.db()).delete("snapshots", id);
    await this.collectAssets();
  }
  async restoreSnapshot(mode: JournalMode, id: string, revision: number) {
    const snapshot = await (await this.db()).get("snapshots", id);
    if (!snapshot?.data || snapshot.mode !== mode)
      return {
        ok: false,
        reason: "validation",
        message: "نسخهٔ بازیابی معتبر نیست.",
      } as const;
    return this.commit(mode, revision, {
      data: snapshot.data,
      audit: snapshot.auditEvents,
      replaceAudit: true,
      destructive: true,
    });
  }
  async auditTrail(mode: JournalMode) {
    const rows = await (await this.db()).getAllFromIndex("audit", "mode", mode);
    const audit = inspectAudit(rows, mode);
    if (audit.rejected.length) {
      this.blocked.add(mode);
      throw new Error(
        "سابقهٔ اصلاح آسیب دیده است؛ ابتدا بازیابی را بررسی کن: " +
          auditReasons(audit.rejected),
      );
    }
    return audit.accepted;
  }
}
