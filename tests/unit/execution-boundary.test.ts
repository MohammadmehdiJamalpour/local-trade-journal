import { describe, expect, it } from "vitest";
import {
  canonicalTrade,
  calculateInitialPlan,
} from "../../src/domain/economics";
import { rawTrade } from "../fixtures/journal";

const executed = () => {
  const raw = rawTrade({ status: "open", exit: null });
  return canonicalTrade(
    { ...raw, initialPlan: calculateInitialPlan(raw) },
    "USD",
  );
};

describe("execution and attachment boundaries", () => {
  it.each(["risk", "reward", "rr", "source"] as const)(
    "rejects a tampered recorded %s",
    (field) => {
      const trade = executed();
      const initialPlan = {
        ...trade.initialPlan,
        [field]: field === "source" ? "untrusted" : "999",
      };
      expect(() => canonicalTrade({ ...trade, initialPlan }, "USD")).toThrow();
    },
  );
  it.each([{ entry: "101" }, { quantity: "11" }, { entryFxRate: "2" }])(
    "requires a matching execution snapshot for %j",
    (override) => {
      expect(() =>
        canonicalTrade({ ...executed(), ...override }, "USD"),
      ).toThrow();
    },
  );
  it("rejects instrument changes without a corrected execution snapshot", () => {
    const trade = executed();
    expect(() =>
      canonicalTrade(
        { ...trade, instrument: { ...trade.instrument, multiplier: "10" } },
        "USD",
      ),
    ).toThrow();
  });
  it("accepts stop and target management while retaining recorded initial risk", () => {
    const trade = canonicalTrade(
      { ...executed(), stop: "105", target: "150" },
      "USD",
    );
    expect(trade.initialPlan.risk).toBe("100");
    expect(trade.initialPlan.stop).toBe("90");
  });
  it("retains unknown legacy stop and target values without reconstructing them", () => {
    const trade = canonicalTrade(
      rawTrade({
        plannedRisk: "100",
        plannedReward: "200",
        plannedRR: "2",
        stop: 105,
      }),
      "USD",
    );
    expect(trade.initialPlan).toMatchObject({
      source: "legacy-assumption",
      stop: null,
      target: null,
      risk: "100",
    });
  });
  it("flags an absent historical risk baseline as an assumption", () => {
    const trade = canonicalTrade(rawTrade({ legacyAssumptions: true }), "USD");
    expect(trade.initialPlan).toMatchObject({
      source: "legacy-assumption",
      risk: "100",
      stop: null,
      target: null,
    });
    expect(
      canonicalTrade({ ...trade, stop: "105" }, "USD").initialPlan.risk,
    ).toBe("100");
  });
  it("rejects account currency relabeling", () => {
    expect(() =>
      canonicalTrade({ ...executed(), accountCurrency: "EUR" }, "USD"),
    ).toThrow();
  });
  it.each([
    {},
    null,
    "invalid",
    [null],
    [
      {
        id: "img-x",
        name: "x",
        type: "text/html",
        size: 1,
        width: 1,
        height: 1,
      },
    ],
    Array.from({ length: 7 }, (_, index) => ({
      id: "img-" + index,
      name: "",
      type: "image/png",
      size: 1,
      width: 1,
      height: 1,
    })),
  ])("rejects malformed image references %j", (images) => {
    expect(() => canonicalTrade({ ...executed(), images }, "USD")).toThrow();
  });
  it("accepts bounded image references", () => {
    const images = [
      {
        id: "img-x",
        name: "chart",
        type: "image/png",
        size: 1024,
        width: 100,
        height: 100,
      },
    ];
    expect(canonicalTrade({ ...executed(), images }, "USD").images).toEqual(
      images,
    );
  });
  it("rejects excessive decoded image pixels", () => {
    const images = [
      {
        id: "img-x",
        name: "",
        type: "image/png",
        size: 1,
        width: 8192,
        height: 8192,
      },
    ];
    expect(() => canonicalTrade({ ...executed(), images }, "USD")).toThrow();
  });
});
