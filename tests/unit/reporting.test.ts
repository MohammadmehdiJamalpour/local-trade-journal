import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterReport,
  recordedReport,
  tradeResult,
} from "../../src/reporting/engine";
import { canonicalTrade } from "../../src/domain/economics";
import { rawTrade } from "../fixtures/journal";

afterEach(() => vi.unstubAllGlobals());
describe("report calculations", () => {
  it("filters accounts, status, symbol, and secondary setup selections", () => {
    const first = canonicalTrade(
      rawTrade({ strategies: ["Alpha", "Secondary"], accountCurrency: "USD" }),
      "USD",
    );
    const second = canonicalTrade(
      rawTrade({ id: "second", accountId: "other", status: "open" }),
      "USD",
    );
    expect(filterReport([first, second], { search: "secondary" }).ids).toEqual([
      "trade-1",
    ]);
    expect(
      filterReport([first, second], {
        search: "",
        accountId: "other",
        status: "open",
      }).ids,
    ).toEqual(["second"]);
    expect(
      filterReport([first, second], { search: "", status: "closed" }).ids,
    ).toEqual(["trade-1"]);
    expect(
      filterReport([first, second], { search: "missing", status: "all" })
        .winRate,
    ).toBeNull();
    expect(tradeResult(first)).toBe(tradeResult(first));
  });
  it("keeps monetary totals separated by currency and excludes breakevens from win rate", () => {
    const trades = [
      canonicalTrade(rawTrade({ accountCurrency: "USD" }), "USD"),
      canonicalTrade(
        rawTrade({ id: "eur", accountCurrency: "EUR", exit: 80 }),
        "EUR",
      ),
      canonicalTrade(
        rawTrade({ id: "zero", accountCurrency: "USD", exit: 100, fees: 0 }),
        "USD",
      ),
    ];
    const result = filterReport(trades, { search: "" });
    expect(result).toMatchObject({
      wins: 1,
      losses: 1,
      breakevens: 1,
      winRate: 50,
      currencies: { USD: "190", EUR: "-210" },
    });
  });
  it("returns worker results with revision and request identity and contains failures", async () => {
    const target = {
      postMessage: vi.fn(),
      onmessage: undefined as ((event: MessageEvent) => void) | undefined,
    };
    vi.stubGlobal("self", target);
    await import("../../src/reporting/worker");
    target.onmessage!({
      data: {
        id: 7,
        revision: 3,
        query: { search: "" },
        trades: [canonicalTrade(rawTrade(), "USD")],
      },
    } as MessageEvent);
    expect(target.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 7,
        revision: 3,
        result: expect.objectContaining({ count: 1 }),
      }),
    );
    target.onmessage!({
      data: {
        id: 8,
        revision: 3,
        query: { search: "" },
        trades: [{ status: "closed", entry: "invalid" }],
      },
    } as MessageEvent);
    expect(target.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 8, error: expect.any(String) }),
    );
    const trades = [canonicalTrade(rawTrade(), "USD")];
    const facts = trades.map((trade) => ({
      ...trade,
      accountCurrency: "USD",
      plannedRR: String(trade.plannedRR),
    }));
    expect(recordedReport(facts, { search: "" })).toEqual(
      filterReport(trades, { search: "" }),
    );
    target.onmessage!({
      data: { id: 9, revision: 3, query: { search: "" }, facts },
    } as MessageEvent);
    expect(target.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 9,
        result: expect.objectContaining({ count: 1 }),
      }),
    );
    expect(() =>
      recordedReport([{ ...facts[0], netPnl: "Infinity" }], { search: "" }),
    ).toThrow();
    expect(
      recordedReport(
        [
          { ...facts[0], netPnl: "-1" },
          { ...facts[0], id: "zero", netPnl: "0" },
        ],
        { search: "" },
      ),
    ).toMatchObject({ losses: 1, breakevens: 1 });
  });
});
