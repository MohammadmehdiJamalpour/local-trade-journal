import { calculateRealized } from "../domain/economics";
import { Decimal } from "../domain/numbers";
import type { TradeRecord } from "../domain/types";

const results = new WeakMap<
  TradeRecord,
  ReturnType<typeof calculateRealized>
>();
export function tradeResult(trade: TradeRecord) {
  let result = results.get(trade);
  if (!result) {
    result = calculateRealized(trade);
    results.set(trade, result);
  }
  return result;
}
export interface ReportQuery {
  search: string;
  accountId?: string;
  status?: string;
}
export interface ReportFact {
  id: string;
  accountId: string;
  status: string;
  symbol: string;
  strategy?: unknown;
  strategies?: unknown[];
  accountCurrency: string;
  plannedRR: string;
  netPnl?: string;
  realizedR?: string;
  outcome?: string;
}
function summarize<T extends ReportFact>(
  trades: T[],
  query: ReportQuery,
  resultOf: (trade: T) => {
    netPnl: string;
    realizedR: string;
    outcome: string;
  },
) {
  const search = query.search.trim().toLocaleLowerCase("fa");
  const filtered = trades.filter(
    (trade) =>
      (!query.accountId || trade.accountId === query.accountId) &&
      (!query.status ||
        query.status === "all" ||
        trade.status === query.status) &&
      (!search ||
        [
          trade.symbol,
          trade.strategy,
          ...(Array.isArray(trade.strategies) ? trade.strategies : []),
        ]
          .join(" ")
          .toLocaleLowerCase("fa")
          .includes(search)),
  );
  const currencies: Record<string, string> = {};
  let wins = 0,
    losses = 0,
    breakevens = 0,
    open = 0;
  let r = new Decimal(0),
    planned = new Decimal(0),
    profits = new Decimal(0),
    lossesMoney = new Decimal(0);
  const closed: {
    id: string;
    netPnl: string;
    realizedR: string;
    outcome: string;
  }[] = [];
  for (const trade of filtered) if (trade.status === "open") open++;
  for (const trade of filtered)
    if (trade.status === "closed") {
      const result = resultOf(trade),
        currency = trade.accountCurrency;
      currencies[currency] = new Decimal(currencies[currency] || 0)
        .plus(result.netPnl)
        .toString();
      r = r.plus(result.realizedR);
      planned = planned.plus(trade.plannedRR);
      if (new Decimal(result.netPnl).gt(0))
        profits = profits.plus(result.netPnl);
      else lossesMoney = lossesMoney.minus(result.netPnl);
      closed.push({
        id: trade.id,
        netPnl: result.netPnl,
        realizedR: result.realizedR,
        outcome: result.outcome,
      });
      if (result.outcome === "win") wins++;
      else if (result.outcome === "loss") losses++;
      else breakevens++;
    }
  return {
    ids: filtered.map((trade) => trade.id),
    count: filtered.length,
    wins,
    losses,
    breakevens,
    winRate: wins + losses ? (wins / (wins + losses)) * 100 : null,
    currencies,
    open,
    closed,
    avgR: closed.length ? r.div(closed.length).toString() : null,
    avgPlannedRR: closed.length ? planned.div(closed.length).toString() : null,
    profitFactor:
      Object.keys(currencies).length < 2 && lossesMoney.gt(0)
        ? profits.div(lossesMoney).toString()
        : null,
  };
}
export function filterReport(trades: TradeRecord[], query: ReportQuery) {
  return summarize(
    trades.map((trade) => ({
      ...trade,
      accountCurrency: String(
        trade.accountCurrency || trade.instrument.quoteCurrency,
      ),
      plannedRR: String(trade.plannedRR),
    })),
    query,
    tradeResult,
  );
}
/** Facts come only from a validated committed revision, never directly from imported rows. */
export function recordedReport(trades: ReportFact[], query: ReportQuery) {
  return summarize(trades, query, (trade) => {
    const net = new Decimal(trade.netPnl!),
      r = new Decimal(trade.realizedR!);
    if (!net.isFinite() || !r.isFinite())
      throw new Error("نتیجهٔ ثبت‌شده معتبر نیست.");
    return {
      netPnl: net.toString(),
      realizedR: r.toString(),
      outcome: net.gt(0) ? "win" : net.lt(0) ? "loss" : "breakeven",
    };
  });
}
