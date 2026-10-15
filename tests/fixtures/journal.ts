import { canonicalTrade } from "../../src/domain/economics";
import type { JournalData, RejectedRecord } from "../../src/domain/types";

export const rawTrade = (overrides: Record<string, unknown> = {}) => ({
  id: "trade-1",
  accountId: "account-main",
  status: "closed",
  direction: "long",
  symbol: "TEST",
  openDate: "2026-10-14",
  openTime: "10:00",
  closeDate: "2026-10-14",
  closeTime: "11:00",
  entry: 100,
  stop: 90,
  target: 120,
  quantity: 10,
  exit: 120,
  fees: 10,
  images: [],
  ...overrides,
});
export function journal(overrides: Record<string, unknown> = {}): JournalData {
  return {
    version: 13,
    settings: { currency: "USD" },
    options: {},
    accounts: [
      {
        id: "account-main",
        name: "Main",
        currency: "USD",
        accountBalance: "10000",
        riskMode: "percent",
        riskPercent: "1",
        fixedRisk: "100",
        archived: false,
      },
    ],
    trades: [canonicalTrade(rawTrade(), "USD")],
    ...overrides,
  } as JournalData;
}
export function normalize(raw: unknown) {
  const source = raw as JournalData,
    data = journal({ ...source, trades: [] });
  const rejected: RejectedRecord[] = [],
    ids = new Set<string>();
  source.trades.forEach((trade, index) => {
    try {
      const value = canonicalTrade(trade, "USD");
      if (ids.has(value.id)) throw new Error("Duplicate ID");
      ids.add(value.id);
      data.trades.push(value);
    } catch (error) {
      rejected.push({ index, raw: trade, reasons: [String(error)] });
    }
  });
  return { data, rejected };
}
