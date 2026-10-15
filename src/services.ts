import {
  JournalRepository,
  DOCUMENT_VERSION,
  assetMatches,
  hashBytes,
  type Draft,
  type Normalizer,
} from "./persistence/repository";
import {
  canonicalTrade,
  calculateFills,
  calculateInitialPlan,
  calculateRealized,
  getInstrument,
  maximumTouchedR,
  MONEY_FIELDS,
  normalizeEconomics,
} from "./domain/economics";
import { canonical, decimal } from "./domain/numbers";
import type {
  Account,
  AuditEvent,
  ImageAsset,
  JournalData,
  JournalMode,
  LoadResult,
  TradeRecord,
} from "./domain/types";
import {
  toPortableAsset,
  toStoredAsset,
  type PortableAsset,
} from "./portability/assets";
import {
  decryptBackup,
  encryptBackup,
  RECORD_LIMIT,
  validateFileSize,
} from "./portability/crypto";
import {
  dialogs,
  mountApplicationPanels,
  advanced,
  updateRecoveryPanel,
  updateStorageStatus,
} from "./ui/application";
import ReportingWorker from "./reporting/worker?worker&inline";
import ParserWorker from "./portability/parser.worker?worker&inline";
import { parseCSV } from "./portability/csv";
import { z } from "zod";
import type { recordedReport, ReportFact } from "./reporting/engine";
import { correctionRequired, destructiveChange } from "./domain/corrections";
import {
  accountRelationshipIssues,
  inspectAudit,
  modernRecordIssues,
} from "./domain/boundaries";
import { previewRExit } from "./domain/exitShortcut";
import { acquireDraftSession } from "./persistence/draftSession";

type LegacyObject = Record<string, unknown>;
interface LegacyJournal {
  version: number;
  settings: LegacyObject;
  accounts: LegacyObject[];
  options: Record<string, unknown[]>;
  trades: LegacyObject[];
}
interface LegacyValidation {
  data: LegacyJournal;
  rejected: LoadResult["rejected"];
}
let repository: JournalRepository;
let normalizer: Normalizer;
let current: LoadResult;
let mode: JournalMode = "live";
let draftId = "";
let draftToken = 0;
let currentDraftImages: string[] = [];
let draftPayload: unknown;
let draftTimer: ReturnType<typeof setTimeout>;
let reportingWorker: Worker | undefined;
let reportId = 0;
let pendingReport:
  { trades: TradeRecord[]; query: string; id: number } | undefined;
const reportCache = new WeakMap<
  TradeRecord[],
  { query: string; revision: number; result: ReturnType<typeof recordedReport> }
>();
let onDraftRestore: ((payload: unknown) => void) | undefined;
let restorableDraft: Draft | undefined;
let draftRestorePending = false;
let readableLegacyAssets: ImageAsset[] = [];
const viewTrades = new WeakMap<LegacyObject, TradeRecord>();
const viewAccounts = new WeakMap<LegacyObject, Account>();
const calculationCache = new WeakMap<
  LegacyObject,
  {
    valid: boolean;
    grossPnl: number;
    netPnl: number;
    realizedR: number;
    outcome: string;
  }
>();
let committedTradeSignatures = new Map<string, string>();
let committedTrades = new Map<string, TradeRecord>();
function updateSignatures() {
  committedTrades = new Map(
    current.data.trades.map((trade) => [trade.id, trade]),
  );
  committedTradeSignatures = new Map(
    current.data.trades.map((trade) => [trade.id, JSON.stringify(trade)]),
  );
}
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "عملیات کامل نشد.";
function currencyFor(accountId: unknown, data: LegacyJournal | JournalData) {
  return String(
    data.accounts.find((account) => account.id === accountId)?.currency ||
      data.settings.currency ||
      "USD",
  );
}
export function canonicalJournal(data: LegacyJournal): JournalData {
  const currency = String(data.settings.currency || "USD");
  return {
    ...data,
    version: DOCUMENT_VERSION,
    accounts: data.accounts.map((account) => {
      const original = viewAccounts.get(account);
      return {
        ...account,
        currency: String(account.currency || currency),
        accountBalance: canonical(
          original?.accountBalance ?? account.accountBalance,
        ),
        riskPercent: canonical(original?.riskPercent ?? account.riskPercent),
        fixedRisk: canonical(original?.fixedRisk ?? account.fixedRisk),
      };
    }) as JournalData["accounts"],
    trades: data.trades.map((trade) => ({
      ...canonicalTrade(trade, currencyFor(trade.accountId, data)),
      accountCurrency: currencyFor(trade.accountId, data),
    })),
  };
}
export function viewJournal(data: JournalData): LegacyJournal {
  return {
    ...data,
    accounts: data.accounts.map((account) => {
      const value = {
        ...account,
        accountBalance: Number(account.accountBalance),
        riskPercent: Number(account.riskPercent),
        fixedRisk: Number(account.fixedRisk),
      };
      viewAccounts.set(value, account);
      return value;
    }),
    trades: data.trades.map((trade) => {
      const result: LegacyObject = { ...trade };
      for (const field of MONEY_FIELDS)
        if (result[field] != null) result[field] = Number(result[field]);
      viewTrades.set(result, trade);
      if (trade.status === "closed")
        calculationCache.set(trade, {
          valid: true,
          grossPnl: Number(trade.grossPnl),
          netPnl: Number(trade.netPnl),
          realizedR: Number(trade.realizedR),
          outcome: String(trade.outcome),
        });
      return result;
    }),
  };
}
async function legacyAssets(source?: {
  key: string;
  raw: string;
}): Promise<ImageAsset[]> {
  if (!source) return [];
  let ids: string[];
  try {
    const parsed = JSON.parse(source.raw) as LegacyJournal;
    ids = [
      ...new Set(
        parsed.trades.flatMap((trade) =>
          ((trade.images || []) as { id: string }[]).map((image) => image.id),
        ),
      ),
    ];
  } catch {
    return [];
  }
  if (!ids.length) return [];
  const db = await new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = indexedDB.open("edge-journal-images:v1");
      let blocked = false;
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => {
        blocked = true;
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
  if (!db || !db.objectStoreNames.contains("images")) {
    db?.close();
    return [];
  }
  const result: ImageAsset[] = [];
  for (const id of ids) {
    const raw = await new Promise<PortableAsset | undefined>((resolve) => {
      const tx = db.transaction("images"),
        request = tx.objectStore("images").get(id);
      request.onsuccess = () =>
        resolve(request.result as PortableAsset | undefined);
      request.onerror = () => resolve(undefined);
    });
    if (raw)
      try {
        result.push(await toStoredAsset(raw));
      } catch {
        /* Missing/corrupt assets require explicit recovery. */
      }
  }
  db.close();
  return result;
}
async function saveDraftNow() {
  if (!repository || !draftId || !draftPayload) return;
  try {
    await repository.saveDraft({
      id: draftId,
      mode,
      payload: draftPayload,
      assetIds: currentDraftImages,
      generation: draftToken,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    updateStorageStatus("پیش‌نویس ذخیره نشد: " + errorText(error), true);
  }
}
const services = {
  async load(
    selectedMode: JournalMode,
    fallback: LegacyJournal,
    validate: (raw: unknown) => LegacyValidation,
  ): Promise<LegacyJournal> {
    mode = selectedMode;
    normalizer = (raw) => {
      try {
        if (
          !raw ||
          typeof raw !== "object" ||
          !Array.isArray((raw as LegacyJournal).trades)
        )
          throw new Error("ساختار ژورنال معتبر نیست.");
        const version = (raw as LegacyJournal).version;
        if (
          !Number.isInteger(version) ||
          version < 1 ||
          version > DOCUMENT_VERSION
        )
          throw new Error("نسخهٔ ژورنال پشتیبانی نمی‌شود.");
        if ((raw as LegacyJournal).trades.length > RECORD_LIMIT)
          throw new Error("حداکثر تعداد رکورد در هر ورود ۱۰۰٬۰۰۰ است.");
        const actual = raw as LegacyJournal;
        const originalById = new Map(
          (current?.data.trades || []).map((trade) => [trade.id, trade]),
        );
        const preciseRaw = {
          ...actual,
          accounts: Array.isArray(actual.accounts)
            ? actual.accounts.map(
                (account) => viewAccounts.get(account) || account,
              )
            : actual.accounts,
          trades: actual.trades.map((trade) => {
            const mapped = viewTrades.get(trade);
            if (mapped) return mapped;
            const original = originalById.get(String(trade?.id));
            if (!original || !trade || typeof trade !== "object") return trade;
            const value = { ...trade };
            for (const field of MONEY_FIELDS)
              if (
                typeof value[field] === "number" &&
                Number(original[field]) === value[field]
              )
                value[field] = original[field];
            return value;
          }),
        };
        if (version < 13)
          preciseRaw.trades = preciseRaw.trades.map((trade) =>
            trade && typeof trade === "object"
              ? { ...trade, legacyAssumptions: true }
              : trade,
          );
        const relationshipIssues = [
          ...accountRelationshipIssues(preciseRaw),
          ...modernRecordIssues(preciseRaw),
        ];
        const rejectedIndices = new Set(
          relationshipIssues.map((item) => item.index),
        );
        const originalIndices: number[] = [];
        const boundaryTrades = preciseRaw.trades.filter((_, index) => {
          if (rejectedIndices.has(index)) return false;
          originalIndices.push(index);
          return true;
        });
        const validation = validate({ ...preciseRaw, trades: boundaryTrades });
        validation.rejected = validation.rejected.map((item) => ({
          ...item,
          index: originalIndices[item.index] ?? item.index,
        }));
        validation.rejected.push(...relationshipIssues);
        const existingObjects = new Set(current?.data.trades || []);
        const sourceAccounts = preciseRaw.accounts;
        if (sourceAccounts != null && !Array.isArray(sourceAccounts))
          throw new Error("فهرست حساب‌ها معتبر نیست.");
        const accountIds = new Set<string>();
        for (const account of sourceAccounts || []) {
          if (
            !account ||
            typeof account.id !== "string" ||
            !account.id ||
            accountIds.has(account.id)
          )
            throw new Error("شناسهٔ حساب نامعتبر یا تکراری است.");
          accountIds.add(account.id);
          if (
            (version >= 13 || account.currency != null) &&
            (typeof account.currency !== "string" ||
              !/^[A-Z0-9]{1,8}$/.test(account.currency))
          )
            throw new Error("ارز حساب معتبر نیست.");
          const validated = validation.data.accounts.find(
            (item) => item.id === account.id,
          );
          if (validated)
            for (const field of ["accountBalance", "riskPercent", "fixedRisk"])
              if (account[field] != null) {
                if (!decimal(account[field]).gt(0))
                  throw new Error("بودجهٔ حساب باید مثبت باشد.");
                validated[field] = canonical(account[field]);
              }
        }
        const data = canonicalJournal({ ...validation.data, trades: [] });
        for (let index = 0; index < validation.data.trades.length; index++) {
          const trade = validation.data.trades[index];
          try {
            data.trades.push(
              existingObjects.has(trade as TradeRecord)
                ? (trade as TradeRecord)
                : {
                    ...canonicalTrade(
                      trade,
                      currencyFor(trade.accountId, data),
                    ),
                    accountCurrency: currencyFor(trade.accountId, data),
                  },
            );
          } catch (error) {
            validation.rejected.push({
              index:
                originalIndices[
                  boundaryTrades.findIndex((item) => item?.id === trade.id)
                ] ?? index,
              raw:
                preciseRaw.trades.find((item) => item?.id === trade.id) ??
                trade,
              reasons: [errorText(error)],
            });
          }
        }
        return { data, rejected: validation.rejected };
      } catch (error) {
        return {
          data: canonicalJournal(fallback),
          rejected: [{ index: -1, raw, reasons: [errorText(error)] }],
        };
      }
    };
    repository = new JournalRepository(normalizer);
    const draftSession = await acquireDraftSession(mode);
    draftId = draftSession.id;
    let source: { key: string; raw: string } | undefined;
    let stored = false;
    try {
      stored = await repository.hasJournal(mode);
    } catch {
      /* loadJournal reports persistence failures. */
    }
    if (!stored) {
      for (const key of mode === "demo"
        ? ["edge-journal:demo:v4:100"]
        : ["edge-journal:v3", "edge-journal:v2", "edge-journal:v1"]) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            source = { key, raw };
            break;
          }
        } catch {
          /* No legacy storage access. */
        }
      }
    }
    readableLegacyAssets = await legacyAssets(source);
    current = await repository.loadJournal(
      mode,
      canonicalJournal(fallback),
      source,
      readableLegacyAssets,
      true,
    );
    updateSignatures();
    restorableDraft = draftSession.restoreId
      ? await repository.getDraft(draftSession.restoreId).catch(() => undefined)
      : undefined;
    draftRestorePending = Boolean(
      restorableDraft?.payload &&
      Object.keys(restorableDraft.payload as LegacyObject).length,
    );
    mountApplicationPanels();
    updateRecoveryPanel(current);
    updateStorageStatus(
      current.status === "ready" || current.status === "empty"
        ? "ژورنال در ذخیره‌سازی مرورگر آماده است."
        : "ژورنال فقط خواندنی است؛ بازیابی یا ذخیره‌سازی را بررسی کن.",
      !["ready", "empty"].includes(current.status),
    );
    repository.subscribe((changedMode, revision) => {
      if (changedMode === mode && revision !== current.revision)
        updateStorageStatus(
          "این ژورنال در تب دیگری تغییر کرده است. پیش‌نویس حفظ می‌شود؛ پیش از ذخیره صفحه را تازه‌سازی کن.",
          true,
        );
    });
    globalThis.addEventListener("storage", (event) => {
      if (event.key === "edge-journal:revision")
        updateStorageStatus(
          "ژورنال در تب دیگری تغییر کرد؛ پیش از ذخیره نسخهٔ تازه را بررسی کن.",
          true,
        );
    });
    globalThis.addEventListener("edge-storage-status", () =>
      updateStorageStatus(
        "ارتباط ذخیره‌سازی قطع یا در تب دیگری قفل شده است؛ صفحه را باز نگه دار و دوباره تلاش کن.",
        true,
      ),
    );
    return viewJournal(current.data);
  },
  get repository() {
    return repository;
  },
  get state() {
    return current;
  },
  get mode() {
    return mode;
  },
  cachedNormalized(raw: LegacyObject) {
    if (
      raw &&
      typeof raw.id === "string" &&
      committedTradeSignatures.get(raw.id) === JSON.stringify(raw)
    )
      return committedTrades.get(raw.id);
    return undefined;
  },
  numeric(value: unknown, signed = false) {
    try {
      const result = decimal(value);
      return signed || result.gt(0) ? result.toString() : null;
    } catch {
      return null;
    }
  },
  preciseFormTrade(trade: LegacyObject): LegacyObject {
    return viewTrades.get(trade) || trade;
  },
  maximumTouchedR(trade: LegacyObject) {
    const value = maximumTouchedR(viewTrades.get(trade) || trade);
    return value === null ? null : Number(value);
  },
  currencyTotals(items: { trade: LegacyObject; netPnl: unknown }[]) {
    const totals: Record<string, string> = {};
    for (const item of items) {
      const precise = viewTrades.get(item.trade),
        currency = String(
          precise?.accountCurrency ||
            item.trade.accountCurrency ||
            current?.data.accounts.find(
              (account) => account.id === item.trade.accountId,
            )?.currency ||
            "USD",
        );
      totals[currency] = decimal(totals[currency] || 0)
        .plus(decimal(precise?.netPnl ?? item.netPnl))
        .toString();
    }
    return totals;
  },
  cancelReport() {
    reportId++;
  },
  setFormCurrency(currency: string) {
    advanced.update({ accountCurrency: currency });
  },
  async save(next: LegacyJournal): Promise<LegacyJournal | null> {
    try {
      const validation = normalizer(next);
      if (validation.rejected.length)
        throw new Error(
          validation.rejected.flatMap((item) => item.reasons).join("؛ "),
        );
      const data = validation.data,
        events: AuditEvent[] = [],
        originals = new Map(
          current.data.trades.map((trade) => [trade.id, trade]),
        );
      for (const account of data.accounts) {
        const previous = current.data.accounts.find(
          (item) => item.id === account.id,
        );
        if (
          previous &&
          previous.currency !== account.currency &&
          current.data.trades.some((trade) => trade.accountId === account.id)
        )
          throw new Error(
            "ارز حساب دارای سابقه را نمی‌توان بدون تبدیل و اصلاح معاملات تغییر داد؛ حساب تازه بساز.",
          );
      }
      for (const trade of data.trades) {
        const previous = originals.get(trade.id);
        if (previous && previous.status !== "planned") {
          const executionChanged = correctionRequired(previous, trade);

          if (executionChanged) {
            const reason = String(trade.correctionReason || "").trim();
            if (!reason)
              throw new Error(
                "برای اصلاح اجرای اصلی، دلیل اصلاح را در بخش بازار و اصلاحات وارد کن.",
              );
            events.push({
              id: mode + ":" + crypto.randomUUID(),
              mode,
              tradeId: trade.id,
              reason,
              before: previous,
              after: trade,
              createdAt: new Date().toISOString(),
            });
          }
        }
        delete trade.correctionReason;
      }
      const destructive =
        destructiveChange(current.data, data) || events.length > 0;
      if (
        events.length &&
        !(await dialogs.confirm(
          events
            .map((event) => {
              const before = calculateRealized(event.before),
                after = calculateRealized(event.after);
              return (
                event.before.symbol +
                " · " +
                event.reason +
                "\nP&L قبل: " +
                before.netPnl +
                " " +
                event.before.accountCurrency +
                "\nP&L بعد: " +
                after.netPnl +
                " " +
                event.after.accountCurrency +
                "\nR: " +
                before.realizedR +
                " ← " +
                after.realizedR +
                "\nنتیجه در آمار: " +
                before.outcome +
                " ← " +
                after.outcome
              );
            })
            .join("\n\n") + "\nاصلاح با ثبت سابقه ذخیره شود؟",
        ))
      )
        return null;
      const result = await repository.commit(mode, current.revision, {
        data,
        audit: events,
        destructive,
      });
      if (!result.ok) {
        updateStorageStatus(result.message, true);
        return null;
      }
      current = {
        ...current,
        data: result.data,
        revision: result.revision,
        status: "ready",
        rejected: [],
      };
      updateSignatures();
      updateStorageStatus(
        "ذخیره شد · نسخهٔ " +
          new Intl.NumberFormat("fa").format(result.revision),
      );
      return viewJournal(result.data);
    } catch (error) {
      updateStorageStatus(errorText(error), true);
      return null;
    }
  },
  enrichTrade(raw: LegacyObject, trade: LegacyObject) {
    if (raw.correctionError) throw new Error(String(raw.correctionError));
    const accountCurrency = String(
      raw.accountCurrency ||
        current?.data.accounts.find((account) => account.id === raw.accountId)
          ?.currency ||
        current?.data.settings.currency ||
        "USD",
    );
    const preciseInputs = Object.fromEntries(
      [
        "entry",
        "stop",
        "target",
        "quantity",
        "exit",
        "fees",
        "maxUnrealizedProfit",
        "maxUnrealizedLoss",
      ]
        .filter((field) => raw[field] != null && raw[field] !== "")
        .map((field) => [field, canonical(raw[field])]),
    );
    return {
      ...preciseInputs,
      ...normalizeEconomics(
        {
          ...trade,
          ...raw,
          ...preciseInputs,
          plannedRisk: raw.plannedRisk,
          plannedReward: raw.plannedReward,
          plannedRR: raw.plannedRR,
          instrument: raw.instrument,
          initialPlan: raw.initialPlan,
          fills: raw.fills,
          entryFxRate: raw.entryFxRate,
          exitFxRate: raw.exitFxRate,
          feeFxRate: raw.feeFxRate,
        },
        accountCurrency,
      ),
      accountCurrency,
      correctionReason: String(raw.correctionReason || ""),
      feesCurrency: String(raw.feesCurrency || accountCurrency),
    };
  },
  fillEconomics(trade?: LegacyObject) {
    advanced.set(trade || {});
  },
  formEconomics() {
    const values = advanced.get();
    const input = (id: string) =>
      document.getElementById(id) as HTMLInputElement | null;
    const existing = current?.data.trades.find(
      (trade) => trade.id === advanced.editingId,
    );
    const result: LegacyObject = {
      ...values,
      accountCurrency:
        current?.data.accounts.find(
          (account) => account.id === input("trade-account")?.value,
        )?.currency ||
        current?.data.settings.currency ||
        "USD",
    };
    if (existing?.status === "planned") {
      delete result.initialPlan;
      delete result.plannedRisk;
      delete result.plannedReward;
      delete result.plannedRR;
    } else if (existing) result.initialPlan = existing.initialPlan;
    if (String(values.correctionReason || "").trim()) {
      try {
        result.initialPlan = calculateInitialPlan({
          ...result,
          entry: input("entry")?.value,
          stop:
            values.correctionInitialStop ??
            existing?.initialPlan.stop ??
            undefined,
          target:
            values.correctionInitialTarget ??
            existing?.initialPlan.target ??
            undefined,
          quantity: input("quantity")?.value,
          direction: document.querySelector<HTMLInputElement>(
            "input[name=direction]:checked",
          )?.value,
        });
      } catch (error) {
        result.correctionError = errorText(error);
      }
    }
    return result;
  },
  previewRExit(r: unknown, quantity: unknown) {
    const input = (id: string) =>
      (document.getElementById(id) as HTMLInputElement | null)?.value;
    const values = services.formEconomics();
    const existing = current.data.trades.find(
      (trade) => trade.id === advanced.editingId,
    );
    return previewRExit(
      {
        ...values,
        entry: input("entry"),
        stop: input("stop"),
        target: input("target"),
        quantity: input("quantity"),
        status: input("status"),
        direction: document.querySelector<HTMLInputElement>(
          "input[name=direction]:checked",
        )?.value,
        partialExits: existing?.partialExits,
      },
      r,
      quantity,
      values.exitFxRate || "1",
    );
  },
  calculateClosed(input: LegacyObject) {
    const precise = viewTrades.get(input);
    if (precise) input = precise;
    const cached = calculationCache.get(input);
    if (cached) return cached;
    const economic = normalizeEconomics(
      input,
      String(input.accountCurrency || "USD"),
    );
    let fills = economic.fills || [];
    if (!fills.length && Array.isArray(input.partialExits)) {
      const quantity = decimal(input.quantity),
        entry = decimal(input.entry),
        risk = decimal(economic.initialPlan!.risk),
        multiplier = decimal(economic.instrument!.multiplier),
        fx = decimal(economic.entryFxRate),
        sign = input.direction === "short" ? -1 : 1;
      fills = input.partialExits.map(
        (partial: LegacyObject, index: number) => ({
          id: String(partial.id || "partial-" + index),
          quantity: quantity
            .times(decimal(partial.percent))
            .div(100)
            .toString(),
          price: entry
            .plus(
              risk
                .div(quantity)
                .div(multiplier)
                .div(fx)
                .times(decimal(partial.r))
                .times(sign),
            )
            .toString(),
          fxRate: fx.toString(),
          fees: "0",
          feeFxRate: "1",
          date: String(partial.date || ""),
          time: String(partial.time || ""),
        }),
      );
    }
    const result = calculateRealized({ ...input, ...economic, fills });
    const calculated = {
      valid: true,
      grossPnl: Number(result.grossPnl),
      netPnl: Number(result.netPnl),
      realizedR: Number(result.realizedR),
      outcome: result.outcome,
    };
    calculationCache.set(input, calculated);
    return calculated;
  },
  planInput(input: LegacyObject) {
    if (
      input.plannedRisk == null ||
      input.plannedRisk === "" ||
      input.status === "planned"
    )
      return input;
    const multiplier = decimal(getInstrument(input).multiplier),
      fx = decimal(input.entryFxRate ?? 1),
      entry = decimal(input.entry),
      quantity = decimal(input.quantity),
      sign = input.direction === "short" ? -1 : 1;
    const risk = decimal(input.plannedRisk)
        .div(quantity)
        .div(multiplier)
        .div(fx),
      reward = decimal(input.plannedReward || input.plannedRisk)
        .div(quantity)
        .div(multiplier)
        .div(fx);
    return {
      ...input,
      stop: entry.minus(risk.times(sign)).toNumber(),
      target: entry.plus(reward.times(sign)).toNumber(),
    };
  },
  calculatePlan(raw: LegacyObject) {
    try {
      const input = services.planInput(raw),
        instrument = getInstrument(raw),
        entry = decimal(input.entry),
        stop = decimal(input.stop),
        target = decimal(input.target);
      if (
        !instrument.signedPrices &&
        [entry, stop, target].some((value) => !value.gt(0))
      )
        throw new Error("قیمت‌ها باید مثبت باشند.");
      const long = input.direction !== "short";
      if (
        !(long
          ? stop.lt(entry) && target.gt(entry)
          : stop.gt(entry) && target.lt(entry))
      )
        throw new Error(
          long
            ? "در معاملهٔ لانگ باید حد ضرر < ورود < هدف باشد."
            : "در معاملهٔ شورت باید هدف < ورود < حد ضرر باشد.",
        );
      const quantity =
        input.quantity == null || input.quantity === ""
          ? null
          : decimal(input.quantity);
      if (quantity && !quantity.gt(0)) throw new Error("حجم باید مثبت باشد.");
      const stopDistance = entry.minus(stop).abs(),
        targetDistance = target.minus(entry).abs(),
        factor = decimal(instrument.multiplier).times(
          decimal(raw.entryFxRate ?? 1),
        );
      const risk = quantity ? stopDistance.times(quantity).times(factor) : null,
        reward = quantity ? targetDistance.times(quantity).times(factor) : null;
      return {
        valid: true,
        entry: entry.toNumber(),
        stop: stop.toNumber(),
        target: target.toNumber(),
        quantity: quantity?.toNumber() ?? null,
        stopDistance: stopDistance.toNumber(),
        targetDistance: targetDistance.toNumber(),
        riskPerQuantity: stopDistance.times(factor).toNumber(),
        plannedRisk: risk?.toNumber() ?? null,
        plannedReward: reward?.toNumber() ?? null,
        plannedRR: targetDistance.div(stopDistance).toNumber(),
      };
    } catch (error) {
      return { valid: false, reason: errorText(error) };
    }
  },
  calculatePartials(input: LegacyObject) {
    try {
      const economic = normalizeEconomics(
          input,
          String(input.accountCurrency || "USD"),
        ),
        result = calculateFills({ ...input, ...economic });
      const quantity = decimal(input.quantity),
        closedPercent = result.exited.div(quantity).times(100).toNumber(),
        fees = decimal(input.fees || 0)
          .times(decimal(input.feeFxRate || 1))
          .plus(result.fillFees);
      return {
        valid: true,
        errors: [],
        exits: economic.partialExits || [],
        derivedExits: result.derivedExits,
        closedPercent,
        remainingPercent: 100 - closedPercent,
        remainingQuantity: result.remaining.toNumber(),
        weightedR: result.gross.div(result.risk).toNumber(),
        grossPnl: result.gross.toNumber(),
        netPnlToDate: result.gross.minus(fees).toNumber(),
        baselineRisk: result.risk.toNumber(),
      };
    } catch (error) {
      return {
        valid: false,
        errors: [errorText(error)],
        exits: [],
        derivedExits: [],
        closedPercent: null,
        remainingPercent: null,
        remainingQuantity: null,
        weightedR: null,
        grossPnl: null,
        netPnlToDate: null,
        baselineRisk: null,
      };
    }
  },
  async getImage(id: string) {
    const asset =
      (await repository.getAsset(id).catch(() => undefined)) ||
      readableLegacyAssets.find((asset) => asset.id === id);
    return asset ? toPortableAsset(asset) : null;
  },
  async putImage(raw: PortableAsset, token?: number) {
    if (token !== undefined && token !== draftToken)
      throw new Error("پیش‌نویس تصویر تغییر کرده است.");
    const asset = await toStoredAsset(raw);
    if (token !== undefined && token !== draftToken)
      throw new Error("پیش‌نویس تصویر تغییر کرده است.");
    asset.id = "img-" + asset.hash;
    currentDraftImages = [...new Set([...currentDraftImages, asset.id])];
    await repository.stageAsset(asset, {
      id: draftId,
      mode,
      payload: draftPayload || {},
      assetIds: currentDraftImages,
      generation: draftToken,
      updatedAt: new Date().toISOString(),
    });
    if (token !== undefined && token !== draftToken)
      throw new Error("پیش‌نویس کنار گذاشته شد.");
    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      size: asset.size,
      width: asset.width,
      height: asset.height,
    };
  },
  async setDraftImages(images: { id: string }[], token?: number) {
    if (token !== undefined) draftToken = token;
    currentDraftImages = images.map((image) => image.id);
    if (repository && draftId && !draftRestorePending)
      try {
        await repository.saveDraft({
          id: draftId,
          mode,
          payload: draftPayload || {},
          assetIds: currentDraftImages,
          generation: draftToken,
          updatedAt: new Date().toISOString(),
        });
        await repository.collectAssets();
      } catch (error) {
        updateStorageStatus(
          "پیش‌نویس تصویر ذخیره نشد: " + errorText(error),
          true,
        );
      }
  },
  autosave(payload: unknown) {
    draftPayload = payload;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      void saveDraftNow();
    }, 750);
  },
  async clearDraft() {
    clearTimeout(draftTimer);
    draftPayload = undefined;
    currentDraftImages = [];
    if (repository && draftId)
      try {
        await repository.removeDraft(draftId);
      } catch (error) {
        updateStorageStatus(
          "پاک‌سازی پیش‌نویس کامل نشد: " + errorText(error),
          true,
        );
      }
  },
  async restoreDraft(callback: (payload: unknown) => void) {
    onDraftRestore = callback;
    const draft = restorableDraft;
    restorableDraft = undefined;
    if (
      draft?.payload &&
      Object.keys(draft.payload as LegacyObject).length &&
      (await dialogs.confirm(
        "پیش‌نویس ذخیره‌نشده از قبل موجود است. آن را بازگردانم؟",
      ))
    ) {
      draftPayload = draft.payload;
      currentDraftImages = draft.assetIds;
      draftRestorePending = false;
      callback(draft.payload);
    }
    draftRestorePending = false;
  },
  async recover() {
    if (!current.source) throw new Error("منبع بازیابی موجود نیست.");
    const assets = await legacyAssets(current.source);
    for (const trade of current.data.trades)
      for (const image of trade.images)
        if (!assets.some((asset) => asset.id === image.id)) {
          const asset = await repository.getAsset(image.id);
          if (asset) assets.push(asset);
        }
    const data = {
      ...current.data,
      trades: current.data.trades.map((trade) => ({
        ...trade,
        images: trade.images.filter((image) =>
          assetMatches(
            image,
            assets.find((asset) => asset.id === image.id),
          ),
        ),
      })),
    };
    const result = await repository.recover(
      mode,
      current.revision,
      data,
      current.source,
      assets,
    );
    if (!result.ok) throw new Error(result.message);
    location.reload();
  },
  async exportLegacyBackup() {
    if (!current.source) throw new Error("منبع قبلی موجود نیست.");
    const parsed = JSON.parse(current.source.raw) as LegacyJournal;
    const assets = await legacyAssets(current.source);
    const imageAssets = await Promise.all(assets.map(toPortableAsset));
    services.download(
      "journal-before-upgrade.json",
      JSON.stringify({
        ...parsed,
        imageAssets,
        dataMode: mode,
        exportedAt: new Date().toISOString(),
      }),
    );
    updateStorageStatus(
      "پشتیبان پیش از ارتقا آمادهٔ دریافت شد؛ فایل را در دستگاه بررسی کن.",
    );
  },
  download(filename: string, text: string, type = "application/json") {
    const url = URL.createObjectURL(new Blob([text], { type })),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  async exportJSON(encrypted = false) {
    const snapshot = await repository.exportSnapshot(mode);
    if (!snapshot) throw new Error("ژورنال ذخیره‌شده موجود نیست.");
    const imageAssets = await Promise.all(snapshot.assets.map(toPortableAsset));
    const auditEvents = snapshot.auditEvents;
    let text = JSON.stringify({
      ...snapshot.data,
      dataMode: mode,
      exportedAt: new Date().toISOString(),
      revision: snapshot.revision,
      imageAssets,
      auditEvents,
    });
    if (encrypted) {
      const password = await dialogs.password(
        "رمز پشتیبان؛ دست‌کم ۱۲ نویسه. رمز فراموش‌شده قابل بازیابی نیست.",
      );
      if (password === null) return;
      text = await encryptBackup(text, password);
    }
    services.download(
      "edge-journal-" +
        mode +
        "-" +
        new Date().toISOString().slice(0, 10) +
        (encrypted ? ".encrypted.json" : ".json"),
      text,
    );
    updateStorageStatus(
      "فایل پشتیبان آمادهٔ دریافت شد؛ ذخیره شدن فایل را در دستگاه بررسی کن.",
    );
  },
  async parseJSONFile(file: File) {
    validateFileSize(file.size, "json");
    updateStorageStatus("در حال خواندن و بررسی فایل پشتیبان…");
    let parsed: unknown = await services.parseText(await file.text());
    if (
      parsed &&
      typeof parsed === "object" &&
      "format" in parsed &&
      parsed.format === "edge-journal-encrypted"
    ) {
      const password = await dialogs.password("رمز پشتیبان را وارد کن.");
      if (password === null) throw new Error("ورود پشتیبان لغو شد.");
      parsed = await services.parseText(await decryptBackup(parsed, password));
    }
    return parsed;
  },
  async parseText(
    text: string,
    format: "json" | "csv" = "json",
  ): Promise<unknown> {
    if (text.length < 1024 * 1024 || typeof Worker === "undefined")
      return format === "csv" ? parseCSV(text) : (JSON.parse(text) as unknown);
    const worker = new ParserWorker();
    return new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        worker.terminate();
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.value);
      };
      worker.onerror = () => {
        worker.terminate();
        reject(new Error("خواندن فایل کامل نشد."));
      };
      worker.postMessage({ text, format });
    });
  },
  async importJSON(
    parsed: LegacyJournal & {
      imageAssets?: PortableAsset[];
      auditEvents?: AuditEvent[];
    },
    validateAsset: (asset: PortableAsset) => PortableAsset,
    verifyDimensions: (asset: PortableAsset) => Promise<unknown>,
  ): Promise<LegacyJournal | null> {
    const validation = normalizer(parsed);
    if (validation.rejected.length)
      throw new Error(
        validation.rejected.flatMap((item) => item.reasons).join("؛ "),
      );
    const referenced = new Set(
        validation.data.trades.flatMap((trade) =>
          trade.images.map((image) => image.id),
        ),
      ),
      ids = new Set<string>(),
      assets: ImageAsset[] = [];
    for (const raw of parsed.imageAssets || []) {
      updateStorageStatus(
        "در حال بررسی تصویر " +
          (assets.length + 1) +
          " از " +
          (parsed.imageAssets || []).length,
      );
      if (ids.has(raw.id) || !referenced.has(raw.id))
        throw new Error("شناسهٔ تصویر تکراری یا بدون معامله است.");
      ids.add(raw.id);
      const portable = validateAsset(raw);
      await verifyDimensions(portable);
      assets.push(await toStoredAsset(portable));
    }
    for (const trade of validation.data.trades)
      for (const image of trade.images) {
        const asset =
          assets.find((item) => item.id === image.id) ||
          (await repository.getAsset(image.id));
        if (
          !asset ||
          asset.type !== image.type ||
          asset.size !== image.size ||
          asset.width !== image.width ||
          asset.height !== image.height
        )
          throw new Error(
            "تصویر پشتیبان موجود نیست یا اطلاعات آن ناسازگار است.",
          );
      }
    const preview = repository.previewImport(
      validation.data,
      mode,
      current.revision,
      assets,
    );
    preview.raw = current.source?.raw;
    preview.sourceKey = current.source?.key;
    const portableAudit = z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            tradeId: z.string().min(1).max(100),
            reason: z.string().min(1).max(1000),
            createdAt: z.string().datetime(),
            before: z.record(z.string(), z.unknown()),
            after: z.record(z.string(), z.unknown()),
          })
          .passthrough(),
      )
      .max(RECORD_LIMIT)
      .parse(parsed.auditEvents || []);
    const audit = inspectAudit(
      portableAudit.map((event) => ({
        ...event,
        id: mode + ":" + event.id.replace(/^(?:(?:live|demo):)+/, ""),
        mode,
      })),
      mode,
    );
    if (audit.rejected.length)
      throw new Error(
        audit.rejected.flatMap((item) => item.reasons).join("؛ "),
      );
    preview.auditEvents = audit.accepted;
    if (
      !(await dialogs.preview(
        "جایگزینی " +
          (mode === "demo" ? "محیط آزمایشی" : "ژورنال اصلی") +
          " با " +
          validation.data.trades.length +
          " معامله، " +
          validation.data.accounts.length +
          " حساب و " +
          referenced.size +
          " تصویر؟ یک نسخهٔ پیش از تغییر نگه داشته می‌شود. حساب‌ها: " +
          validation.data.accounts
            .map((account) => account.name + " (" + account.currency + ")")
            .join("، "),
        validation.data.trades,
      ))
    ) {
      updateStorageStatus("ورود پشتیبان لغو شد؛ ژورنال تغییر نکرد.");
      return null;
    }
    updateStorageStatus("در حال ثبت اتمی ژورنال و تصاویر…");
    const result = await repository.commitImport(preview);
    if (!result.ok) throw new Error(result.message);
    current = {
      status: "ready",
      data: result.data,
      revision: result.revision,
      rejected: [],
    };
    updateSignatures();
    updateStorageStatus(
      "ذخیره شد · پشتیبان کامل در نسخهٔ " + result.revision + " بازیابی شد.",
    );
    updateRecoveryPanel(current);
    return viewJournal(result.data);
  },
  confirm: dialogs.confirm,
  preview: dialogs.preview,
  progress: updateStorageStatus,
  validateFileSize,
  async storageInfo() {
    const estimate = await navigator.storage?.estimate?.();
    const snapshots = await repository.listSnapshots(mode);
    return { estimate, snapshots };
  },
  async removeLegacySources() {
    if (!["ready", "empty"].includes(current.status))
      throw new Error("ابتدا مهاجرت یا بازیابی را کامل کن.");
    const snapshots = await repository.listSnapshots(mode);
    for (const key of mode === "demo"
      ? ["edge-journal:demo:v4:100"]
      : ["edge-journal:v3", "edge-journal:v2", "edge-journal:v1"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        if (
          !snapshots.some((snapshot) => snapshot.pinned && snapshot.raw === raw)
        )
          await repository.preserveSource(mode, { key, raw });
        localStorage.removeItem(key);
      }
    }
  },
  async requestPersistence() {
    return navigator.storage?.persist ? navigator.storage.persist() : false;
  },
  async restoreSnapshot(id: string) {
    const result = await repository.restoreSnapshot(mode, id, current.revision);
    if (!result.ok) throw new Error(result.message);
    location.reload();
  },
  async report(
    trades: TradeRecord[],
    query: { search: string; accountId?: string; status?: string },
  ) {
    const signature = JSON.stringify(query);
    if (
      pendingReport?.trades === trades &&
      pendingReport.query === signature &&
      pendingReport.id === reportId
    )
      return;
    const id = ++reportId;
    if (trades.length < 2000) return;
    const cached = reportCache.get(trades);
    if (cached?.revision === current.revision && cached.query === signature) {
      globalThis.dispatchEvent(
        new CustomEvent("edge-report", {
          detail: { id, revision: current.revision, result: cached.result },
        }),
      );
      return;
    }
    reportingWorker ||= new ReportingWorker();
    const revision = current.revision;
    const worker = reportingWorker;
    pendingReport = { trades, query: signature, id };
    worker.onmessage = (event) => {
      if (
        event.data.id === reportId &&
        event.data.revision === current.revision
      ) {
        pendingReport = undefined;
        if (event.data.result)
          reportCache.set(trades, {
            revision,
            query: signature,
            result: event.data.result,
          });
        globalThis.dispatchEvent(
          new CustomEvent("edge-report", { detail: event.data }),
        );
      }
    };
    const facts: ReportFact[] = trades.map((trade) => {
      const source = viewTrades.get(trade) || trade;
      return {
        id: source.id,
        accountId: source.accountId,
        status: source.status,
        symbol: source.symbol,
        accountCurrency: String(
          source.accountCurrency || source.instrument.quoteCurrency,
        ),
        plannedRR: String(source.plannedRR),
        netPnl: String(source.netPnl),
        realizedR: String(source.realizedR),
      };
    });
    worker.postMessage({ id, revision, facts, query });
  },
  refreshDraftPreview() {
    if (onDraftRestore && draftPayload) onDraftRestore(draftPayload);
  },
  hashBytes,
};
export { services };
