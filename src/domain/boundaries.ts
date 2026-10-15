import { z } from "zod";
import { canonicalTrade } from "./economics";
import type { AuditEvent, JournalMode, RejectedRecord } from "./types";

const objectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const modernText = z
  .object({
    id: z.string().min(1).max(100),
    accountId: z.string().min(1).max(100),
    symbol: z.string().min(1).max(24),
    openDate: z.string().max(16),
    closeDate: z.string().max(16).optional(),
    openTime: z.string().max(8).optional(),
    closeTime: z.string().max(8).optional(),
    entryReason: z.string().max(1200).optional(),
    exitReason: z.string().max(1000).optional(),
    lesson: z.string().max(1000).optional(),
    screenshotRef: z.string().max(500).optional(),
    notes: z.string().max(3000).optional(),
    createdAt: z.string().max(40).optional(),
    updatedAt: z.string().max(40).optional(),
  })
  .passthrough();

/** Reject modern text/identity values before the legacy adapter can truncate them. */
export function modernRecordIssues(raw: {
  version: number;
  trades: unknown[];
}): RejectedRecord[] {
  if (raw.version < 13) return [];
  return raw.trades.flatMap((trade, index) => {
    const result = modernText.safeParse(trade);
    return result.success
      ? []
      : [
          {
            index,
            raw: trade,
            reasons: result.error.issues.map(
              (issue) => issue.path.join(".") + ": " + issue.message,
            ),
          },
        ];
  });
}

/** Modern documents must not silently recover accounts or relabel monetary history. */
export function accountRelationshipIssues(raw: {
  version: number;
  accounts?: unknown;
  trades: unknown[];
}): RejectedRecord[] {
  if (raw.version < 13) return [];
  const accounts = new Map<string, Record<string, unknown>>();
  for (const account of Array.isArray(raw.accounts) ? raw.accounts : [])
    if (objectRecord(account) && typeof account.id === "string")
      accounts.set(account.id, account);
  const rejected: RejectedRecord[] = [];
  raw.trades.forEach((trade, index) => {
    if (!objectRecord(trade)) return;
    const reasons: string[] = [];
    const account =
      typeof trade.accountId === "string"
        ? accounts.get(trade.accountId)
        : undefined;
    if (!account)
      reasons.push("حساب معامله در فهرست حساب‌های این ژورنال تعریف نشده است.");
    if (
      typeof trade.accountCurrency !== "string" ||
      !/^[A-Z0-9]{1,8}$/.test(trade.accountCurrency)
    )
      reasons.push("ارز حساب معامله باید به‌صراحت و با قالب معتبر ثبت شود.");
    else if (account && trade.accountCurrency !== account.currency)
      reasons.push("ارز ذخیره‌شدهٔ معامله با ارز حساب مرتبط یکسان نیست.");
    if (reasons.length) rejected.push({ index, raw: trade, reasons });
  });
  return rejected;
}

const currency = z.string().regex(/^[A-Z0-9]{1,8}$/);
const snapshot = z
  .object({ id: z.string().min(1).max(100), accountCurrency: currency })
  .passthrough();
const auditSchema = z.object({
  id: z.string().min(1).max(100),
  mode: z.enum(["live", "demo"]),
  tradeId: z.string().min(1).max(100),
  reason: z.string().trim().min(1).max(1000),
  createdAt: z
    .string()
    .datetime({ offset: true })
    .refine((value) => Number.isFinite(Date.parse(value))),
  before: snapshot,
  after: snapshot,
});

/** Inspect persisted/imported audit rows while preserving every rejected original. */
export function inspectAudit(
  events: unknown[],
  mode: JournalMode,
): { accepted: AuditEvent[]; rejected: RejectedRecord[] } {
  const accepted: AuditEvent[] = [],
    rejected: RejectedRecord[] = [],
    ids = new Set<string>();
  events.forEach((raw, index) => {
    try {
      if (objectRecord(raw) && typeof raw.id === "string") {
        if (ids.has(raw.id)) throw new Error("شناسهٔ سابقهٔ اصلاح تکراری است.");
        ids.add(raw.id);
      }
      const event = auditSchema.parse(raw);
      if (event.mode !== mode)
        throw new Error("محیط سابقهٔ اصلاح با ژورنال مرتبط یکسان نیست.");
      if (event.before.id !== event.tradeId || event.after.id !== event.tradeId)
        throw new Error(
          "شناسهٔ معامله در تصاویر قبل و بعدِ اصلاح ناسازگار است.",
        );
      accepted.push({
        ...event,
        before: canonicalTrade(event.before, event.before.accountCurrency),
        after: canonicalTrade(event.after, event.after.accountCurrency),
      });
    } catch (error) {
      rejected.push({
        index,
        raw,
        reasons:
          error instanceof z.ZodError
            ? error.issues.map(
                (issue) => issue.path.join(".") + ": " + issue.message,
              )
            : [
                error instanceof Error
                  ? error.message
                  : "سابقهٔ اصلاح نامعتبر است.",
              ],
      });
    }
  });
  return { accepted, rejected };
}
