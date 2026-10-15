import { describe, expect, it } from "vitest";
import { canonicalTrade } from "../../src/domain/economics";
import {
  correctionRequired,
  destructiveChange,
} from "../../src/domain/corrections";
import type { TradeRecord } from "../../src/domain/types";
import { journal, rawTrade } from "../fixtures/journal";

const openTrade = (overrides: Record<string, unknown> = {}) =>
  canonicalTrade(rawTrade({ status: "open", exit: null, ...overrides }), "USD");
const clone = (trade: TradeRecord) => structuredClone(trade);
const fill = {
  id: "fill-1",
  price: "110",
  quantity: "2",
  fxRate: "1",
  fees: "1",
  feeFxRate: "1",
  feeCurrency: "USD",
  date: "2026-10-14",
  time: "10:30",
};

describe("audited execution corrections", () => {
  it("requires a correction when an existing legacy partial realization is edited or removed", () => {
    const before = openTrade({
      partialExits: [{ id: "partial-1", r: "1", percent: "50" }],
    });
    for (const change of [
      [{ id: "partial-1", r: "3", percent: "50" }],
      [{ id: "partial-1", r: "1", percent: "25" }],
      [],
    ]) {
      const after = { ...clone(before), partialExits: change };
      expect(correctionRequired(before, after)).toBe(true);
    }
  });

  it("allows adding a new legacy partial realization as normal management", () => {
    const before = openTrade({
      partialExits: [{ id: "partial-1", r: "1", percent: "25" }],
    });
    const after = {
      ...clone(before),
      partialExits: [
        ...(before.partialExits as unknown[]),
        { id: "partial-2", r: "2", percent: "25" },
      ],
    };
    expect(correctionRequired(before, after)).toBe(false);
  });

  it("requires a correction when an executed trade is changed back to planned", () => {
    const before = openTrade();
    expect(
      correctionRequired(before, { ...clone(before), status: "planned" }),
    ).toBe(true);
  });

  it("requires corrections for changes to existing price fills and permits additional fills", () => {
    const before = openTrade({ fills: [fill] });
    for (const fills of [
      [{ ...fill, price: "111" }],
      [{ ...fill, quantity: "1" }],
      [{ ...fill, fxRate: "2" }],
      [{ ...fill, fees: "2" }],
      [{ ...fill, date: "2026-10-15" }],
      [],
    ])
      expect(correctionRequired(before, { ...clone(before), fills })).toBe(
        true,
      );
    expect(
      correctionRequired(before, {
        ...clone(before),
        fills: [...before.fills, { ...fill, id: "fill-2" }],
      }),
    ).toBe(false);
  });

  it.each([
    ["entry", "101"],
    ["quantity", "11"],
    ["direction", "short"],
    ["entryFxRate", "2"],
    ["accountId", "other-account"],
    ["symbol", "CORRECTED"],
    ["openDate", "2026-10-13"],
    ["openTime", "09:00"],
  ])(
    "requires a correction for the original execution field %s",
    (field, value) => {
      const before = openTrade();
      expect(
        correctionRequired(before, { ...clone(before), [field]: value }),
      ).toBe(true);
    },
  );

  it("requires a correction for the frozen initial plan or instrument specification", () => {
    const before = openTrade();
    for (const after of [
      {
        ...clone(before),
        initialPlan: { ...before.initialPlan, risk: "200" },
      },
      {
        ...clone(before),
        initialPlan: { ...before.initialPlan, reward: "300" },
      },
      { ...clone(before), initialPlan: { ...before.initialPlan, rr: "3" } },
      { ...clone(before), initialPlan: { ...before.initialPlan, stop: "95" } },
      {
        ...clone(before),
        initialPlan: {
          ...before.initialPlan,
          source: "legacy-assumption" as const,
        },
      },
      {
        ...clone(before),
        instrument: { ...before.instrument, multiplier: "2" },
      },
    ])
      expect(correctionRequired(before, after)).toBe(true);
  });

  it.each([
    ["exit", "121"],
    ["exitFxRate", "2"],
    ["fees", "20"],
    ["feesCurrency", "EUR"],
    ["feeFxRate", "2"],
    ["closeDate", "2026-10-15"],
    ["closeTime", "12:00"],
    ["status", "open"],
  ])("requires a correction for closed execution field %s", (field, value) => {
    const before = canonicalTrade(rawTrade(), "USD");
    expect(
      correctionRequired(before, { ...clone(before), [field]: value }),
    ).toBe(true);
  });

  it("allows planned edits and ordinary executed stop/target management", () => {
    const planned = canonicalTrade(
      rawTrade({ status: "planned", exit: null }),
      "USD",
    );
    expect(
      correctionRequired(planned, {
        ...clone(planned),
        entry: "101",
        quantity: "20",
        direction: "short",
      }),
    ).toBe(false);
    const executed = openTrade();
    expect(
      correctionRequired(executed, {
        ...clone(executed),
        stop: "105",
        target: "130",
        notes: "Management note",
      }),
    ).toBe(false);
    expect(correctionRequired(executed, clone(executed))).toBe(false);
    const closed = canonicalTrade(rawTrade(), "USD");
    expect(correctionRequired(closed, clone(closed))).toBe(false);
    expect(
      correctionRequired(closed, { ...clone(closed), fills: [fill] }),
    ).toBe(true);
    expect(
      correctionRequired(closed, {
        ...clone(closed),
        partialExits: [{ id: "p", r: "1", percent: "20" }],
      }),
    ).toBe(true);
  });
});

describe("pre-destructive-change snapshot classification", () => {
  it("preserves string catalog identities and detects removing a whole catalog group", () => {
    const before = journal({
      options: { strategy: ["one", "two"], empty: [] },
    });
    expect(
      destructiveChange(
        before,
        journal({ options: { strategy: ["one", "two"], empty: [] } }),
      ),
    ).toBe(false);
    expect(destructiveChange(before, journal({ options: {} }))).toBe(true);
  });
  it("treats removing an account or a trade as destructive", () => {
    const before = journal();
    expect(destructiveChange(before, { ...before, accounts: [] })).toBe(true);
    expect(destructiveChange(before, { ...before, trades: [] })).toBe(true);
  });

  it.each([true, false])(
    "treats deleting a %s-used catalog identity as destructive",
    (used) => {
      const before = journal({
        options: {
          strategy: [
            { id: "setup-1", label: "Setup one" },
            { id: "setup-2", label: "Setup two" },
          ],
        },
        trades: [
          canonicalTrade(
            rawTrade({ strategy: used ? "setup-1" : "setup-2" }),
            "USD",
          ),
        ],
      });
      const after = {
        ...before,
        options: { strategy: [{ id: "setup-2", label: "Setup two" }] },
      };
      expect(destructiveChange(before, after)).toBe(true);
    },
  );

  it("allows catalog and account renaming or archiving without identity loss", () => {
    const before = journal({
      options: {
        strategy: [{ id: "setup-1", label: "Setup", archived: false }],
      },
    });
    const after = {
      ...before,
      accounts: before.accounts.map((account) => ({
        ...account,
        name: "Renamed account",
        archived: true,
      })),
      options: {
        strategy: [{ id: "setup-1", label: "Renamed setup", archived: true }],
      },
    };
    expect(destructiveChange(before, after)).toBe(false);
  });
});
