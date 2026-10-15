import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  canonicalTrade,
  calculateInitialPlan,
  calculateRealized,
  legacyInstrument,
  maximumTouchedR,
  normalizeEconomics,
  normalizeLegacyExits,
} from "../../src/domain/economics";
import { canonical, decimal, englishDigits } from "../../src/domain/numbers";
import { rawTrade } from "../fixtures/journal";

describe("decimal and linear instrument calculations", () => {
  it("calculates touched R from the original account risk with exact decimal inputs", () => {
    expect(
      maximumTouchedR({
        status: "open",
        maxUnrealizedProfit: ".3",
        plannedRisk: ".1",
      }),
    ).toBe("3");
    expect(
      maximumTouchedR({
        status: "closed",
        maxUnrealizedProfit: "0",
        initialPlan: { risk: "100" },
      }),
    ).toBe("0");
    for (const value of [
      { status: "planned", maxUnrealizedProfit: 1 },
      { status: "open" },
      { status: "open", maxUnrealizedProfit: "", plannedRisk: 1 },
      { status: "open", maxUnrealizedProfit: -1, plannedRisk: 1 },
      { status: "open", maxUnrealizedProfit: 1, plannedRisk: 0 },
    ])
      expect(maximumTouchedR(value)).toBeNull();
  });
  it("accepts Persian and Arabic digits without binary rounding", () => {
    expect(canonical("۱٬۲۳۴٫۵")).toBe("1234.5");
    expect(englishDigits("١٢٣−۴")).toBe("123-4");
    expect(decimal("0.1").plus("0.2").toString()).toBe("0.3");
  });
  it.each([
    null,
    undefined,
    true,
    [],
    {},
    "",
    "abc",
    "Infinity",
    "NaN",
    "1e101",
    "1e-101",
    "9".repeat(129),
  ])("rejects unsafe numeric input %j", (value) =>
    expect(() => canonical(value)).toThrow(),
  );
  it("calculates a long position", () => {
    const trade = canonicalTrade(rawTrade(), "USD");
    expect(calculateRealized(trade)).toMatchObject({
      netPnl: "190",
      realizedR: "1.9",
      outcome: "win",
    });
  });
  it("calculates a short position", () => {
    const trade = canonicalTrade(
      rawTrade({ direction: "short", stop: 110, target: 80, exit: 80 }),
      "USD",
    );
    expect(calculateRealized(trade).netPnl).toBe("190");
  });
  it("classifies exact fee-adjusted breakeven", () => {
    const trade = canonicalTrade(
      rawTrade({ quantity: 1, exit: "100.2", fees: ".2" }),
      "USD",
    );
    expect(calculateRealized(trade).outcome).toBe("breakeven");
  });
  it("supports lot units and explicit conversion rates", () => {
    const instrument = {
      ...legacyInstrument("EURJPY", "JPY"),
      quantityUnit: "lots",
      multiplier: "100000",
    };
    const trade = canonicalTrade(
      rawTrade({
        instrument,
        entry: 160,
        stop: 159,
        target: 162,
        exit: 161,
        quantity: ".1",
        entryFxRate: ".006",
        exitFxRate: ".0065",
        fees: 0,
      }),
      "USD",
    );
    expect(trade.plannedRisk).toBe("60");
    expect(calculateRealized(trade).netPnl).toBe("65");
  });
  it("supports contracts, signed prices, and fee conversion", () => {
    const instrument = {
      ...legacyInstrument("FUTURE"),
      quantityUnit: "contracts",
      multiplier: "50",
      signedPrices: true,
    };
    const trade = canonicalTrade(
      rawTrade({
        instrument,
        entry: -5,
        stop: -10,
        target: 0,
        exit: 0,
        quantity: 2,
        fees: 1,
        feeFxRate: 2,
      }),
      "USD",
    );
    expect(calculateRealized(trade).netPnl).toBe("498");
  });
  it("permits current stops in profit without changing initial risk", () => {
    const initial = canonicalTrade(rawTrade(), "USD");
    const changed = canonicalTrade({ ...initial, stop: "105" }, "USD");
    expect(changed.initialPlan.risk).toBe("100");
    expect(calculateRealized(changed).realizedR).toBe("1.9");
  });
  it("recalculates planned risk before execution and records each fill fee currency", () => {
    const plan = canonicalTrade(
      rawTrade({ status: "planned", exit: null }),
      "USD",
    );
    expect(
      canonicalTrade({ ...plan, quantity: "20" }, "USD").initialPlan.risk,
    ).toBe("200");
    const fill = {
      id: "f",
      price: "120",
      quantity: "2",
      fxRate: "1",
      fees: "1",
      feeFxRate: "2",
      feeCurrency: "EUR",
      date: "",
      time: "",
    };
    expect(
      canonicalTrade(rawTrade({ fills: [fill] }), "USD").fills[0].feeCurrency,
    ).toBe("EUR");
  });
  it("retains exact legacy R/percent decimals and equivalent signed-contract exits", () => {
    const rows = [
      { r: "-0.1", percent: "33.33333333333333333333333333333333" },
      { id: "second", r: "2", percent: "66.66666666666666666666666666666667" },
    ];
    const normalized = normalizeLegacyExits(rawTrade({ partialExits: rows }));
    expect(normalized[0]).toMatchObject({
      id: "partial-1",
      r: "-0.1",
      percent: rows[0].percent,
      date: "",
      time: "",
    });
    const trade = canonicalTrade(
      rawTrade({ partialExits: rows, exit: null, fees: 0 }),
      "USD",
    );
    expect(trade.partialExits).toEqual(normalized);
    expect(calculateRealized(trade).netPnl).toBe("130");
    const signed = canonicalTrade(
      rawTrade({
        instrument: { ...legacyInstrument("NEG"), signedPrices: true },
        entry: -5,
        stop: -10,
        target: 0,
        exit: null,
        partialExits: [{ r: -2, percent: 100 }],
        fees: 0,
      }),
      "USD",
    );
    expect(calculateRealized(signed).netPnl).toBe("-100");
  });
  it("validates legacy partial chronology without requiring missing historical timestamps", () => {
    const row = { r: 1, percent: 10, date: "2026-10-14", time: "10:30" };
    expect(
      normalizeLegacyExits(
        rawTrade({ partialExits: [row, { ...row, time: "10:45" }] }),
      ),
    ).toHaveLength(2);
    expect(
      normalizeLegacyExits({
        status: "open",
        partialExits: [{ r: 0, percent: 10 }],
      }),
    ).toHaveLength(1);
    for (const rows of [
      [{ ...row, date: "2026-02-30" }],
      [{ ...row, date: "2026-10-13" }],
      [{ ...row, time: "09:00" }],
      [{ ...row, date: "2026-10-15" }],
      [{ ...row, time: "12:00" }],
      [{ ...row, time: "99:00" }],
      [row, { ...row, time: "10:00" }],
      [
        { ...row, id: "dup" },
        { ...row, id: "dup" },
      ],
      [{ ...row, percent: 101 }],
      [
        { ...row, percent: 60 },
        { ...row, percent: 50 },
      ],
    ])
      expect(() =>
        normalizeLegacyExits(rawTrade({ partialExits: rows })),
      ).toThrow();
    expect(() =>
      normalizeLegacyExits(
        rawTrade({ status: "planned", partialExits: [row] }),
      ),
    ).toThrow();
    expect(() =>
      normalizeLegacyExits(
        rawTrade({ status: "open", partialExits: [{ ...row, percent: 100 }] }),
      ),
    ).toThrow();
    expect(() =>
      canonicalTrade(
        rawTrade({
          entry: 1,
          stop: 0.5,
          target: 2,
          exit: null,
          partialExits: [{ r: -10, percent: 100 }],
        }),
        "USD",
      ),
    ).toThrow("مثبت");
  });
  it.each([
    { quantity: 0 },
    { fees: -1 },
    { direction: "sideways" },
    { status: "invalid" },
    { openDate: "2026-02-30" },
    { closeDate: "2026-10-13" },
    { closeTime: "09:00" },
    { instrument: { model: "inverse" } },
  ])("rejects invalid trades %j", (override) =>
    expect(() => canonicalTrade(rawTrade(override), "USD")).toThrow(),
  );
  it("freezes legacy risk without inventing initial stop values", () => {
    const value = canonicalTrade(
      rawTrade({ plannedRisk: 50, plannedReward: 100, plannedRR: 2 }),
      "USD",
    );
    expect(value.initialPlan).toMatchObject({
      risk: "50",
      stop: null,
      target: null,
      source: "legacy-assumption",
    });
  });
  it("calculates partial and remaining exits with separate conversions and fees", () => {
    const fills = [
      {
        id: "f1",
        price: "120",
        quantity: "5",
        fxRate: "2",
        fees: "3",
        feeFxRate: "2",
        date: "2026-10-14",
        time: "10:30",
      },
    ];
    const trade = canonicalTrade(
      rawTrade({ fills, exit: 110, exitFxRate: 3, fees: 10 }),
      "USD",
    );
    expect(calculateRealized(trade)).toMatchObject({
      grossPnl: "350",
      netPnl: "334",
      realizedR: "3.34",
    });
  });
  it("allows a fully closed position without a final exit price", () => {
    const trade = canonicalTrade(
      rawTrade({
        exit: null,
        fills: [
          {
            id: "f",
            price: "120",
            quantity: "10",
            fxRate: "1",
            fees: "0",
            feeFxRate: "1",
            date: "",
            time: "",
          },
        ],
      }),
      "USD",
    );
    expect(calculateRealized(trade).netPnl).toBe("190");
  });
  it("uses Persian quantities in a fully exited form preview", () => {
    const result = normalizeEconomics(
      rawTrade({
        quantity: "۱۰",
        exit: null,
        fills: [
          {
            id: "f",
            price: "۱۲۰",
            quantity: "۱۰",
            fxRate: "۱",
            fees: "۰",
            feeFxRate: "۱",
            date: "",
            time: "",
          },
        ],
      }),
    );
    expect(result.fills?.[0].quantity).toBe("10");
  });
  it.each([
    { quantity: "11" },
    { quantity: "10", status: "open" },
    { date: "2026-10-13" },
    { date: "2026-10-15" },
    { date: "invalid" },
    { time: "25:00" },
  ])("rejects inconsistent fills %j", (override) => {
    const fill = {
      id: "f",
      price: "120",
      quantity: "5",
      fxRate: "1",
      fees: "0",
      feeFxRate: "1",
      date: "2026-10-14",
      time: "10:30",
      ...override,
    };
    expect(() =>
      normalizeEconomics(
        rawTrade({ status: override.status || "closed", fills: [fill] }),
      ),
    ).toThrow();
  });
  it("rejects duplicate fills and double-recorded partial systems", () => {
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
    expect(() =>
      normalizeEconomics(rawTrade({ fills: [fill, fill] })),
    ).toThrow();
    expect(() =>
      normalizeEconomics(
        rawTrade({ fills: [fill], partialExits: [{ r: 1, percent: 20 }] }),
      ),
    ).toThrow();
  });
  it("validates contract increments and initial direction", () => {
    expect(() => calculateInitialPlan(rawTrade({ stop: 110 }))).toThrow();
    expect(() =>
      canonicalTrade(
        rawTrade({
          quantity: 3,
          instrument: { ...legacyInstrument("TEST"), quantityIncrement: "2" },
        }),
        "USD",
      ),
    ).toThrow();
    expect(() =>
      canonicalTrade(
        rawTrade({
          entry: "100.1",
          instrument: { ...legacyInstrument("TEST"), priceIncrement: ".5" },
        }),
        "USD",
      ),
    ).toThrow();
  });
  it("conserves gross P&L when an exit is split into fills", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 101, max: 10000 }),
        (quantity, exit) => {
          const whole = canonicalTrade(
            rawTrade({ quantity, exit, fees: 0 }),
            "USD",
          );
          const split = canonicalTrade(
            rawTrade({
              quantity,
              exit: null,
              fees: 0,
              fills: [
                {
                  id: "a",
                  price: String(exit),
                  quantity: String(quantity / 2),
                  fxRate: "1",
                  fees: "0",
                  feeFxRate: "1",
                  date: "",
                  time: "",
                },
                {
                  id: "b",
                  price: String(exit),
                  quantity: String(quantity / 2),
                  fxRate: "1",
                  fees: "0",
                  feeFxRate: "1",
                  date: "",
                  time: "",
                },
              ],
            }),
            "USD",
          );
          expect(calculateRealized(split).grossPnl).toBe(
            calculateRealized(whole).grossPnl,
          );
        },
      ),
      { seed: 4281, numRuns: 100 },
    );
  });
});
