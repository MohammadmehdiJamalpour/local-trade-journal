import type { JournalData, TradeRecord } from "./types";

export function correctionRequired(
  previous: TradeRecord,
  next: TradeRecord,
): boolean {
  if (previous.status === "planned") return false;
  if (
    next.status === "planned" ||
    [
      "entry",
      "quantity",
      "direction",
      "entryFxRate",
      "accountId",
      "symbol",
      "openDate",
      "openTime",
    ].some((field) => String(previous[field]) !== String(next[field])) ||
    JSON.stringify(previous.instrument) !== JSON.stringify(next.instrument) ||
    JSON.stringify(previous.initialPlan) !== JSON.stringify(next.initialPlan)
  )
    return true;
  if (
    previous.status === "closed" &&
    ([
      "exit",
      "exitFxRate",
      "fees",
      "feesCurrency",
      "feeFxRate",
      "closeDate",
      "closeTime",
      "status",
    ].some((field) => String(previous[field]) !== String(next[field])) ||
      JSON.stringify(previous.fills) !== JSON.stringify(next.fills) ||
      JSON.stringify(previous.partialExits) !==
        JSON.stringify(next.partialExits))
  )
    return true;
  for (const field of ["fills", "partialExits"] as const) {
    const before = (previous[field] || []) as { id: string }[],
      after = (next[field] || []) as { id: string }[];
    if (
      before.some((row) => {
        const saved = after.find((item) => item.id === row.id);
        return !saved || JSON.stringify(saved) !== JSON.stringify(row);
      })
    )
      return true;
  }
  return false;
}
const identity = (value: unknown) =>
  typeof value === "string"
    ? value
    : String((value as { id?: unknown })?.id || "");
export function destructiveChange(
  previous: JournalData,
  next: JournalData,
): boolean {
  const retainedTrades = new Set(next.trades.map((trade) => trade.id));
  const retainedAccounts = new Set(next.accounts.map((account) => account.id));
  if (
    previous.trades.some((trade) => !retainedTrades.has(trade.id)) ||
    previous.accounts.some((account) => !retainedAccounts.has(account.id))
  )
    return true;
  return Object.entries(previous.options).some(([group, values]) => {
    const retained = new Set((next.options[group] || []).map(identity));
    return values.some((value) => !retained.has(identity(value)));
  });
}
