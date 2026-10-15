import { describe, expect, it } from "vitest";
import { previewRExit } from "../../src/domain/exitShortcut";
import { canonicalTrade, legacyInstrument } from "../../src/domain/economics";
import { rawTrade } from "../fixtures/journal";

const trade = () =>
  canonicalTrade(rawTrade({ status: "open", exit: null }), "USD");
describe("R-to-price fill previews", () => {
  it("uses frozen risk and actual realization conversion", () => {
    expect(previewRExit({ ...trade(), stop: "105" }, "2", "4", "2")).toEqual({
      price: "110",
      quantity: "4",
      fxRate: "2",
      r: "2",
    });
  });
  it("supports short and signed-price contracts", () => {
    const short = canonicalTrade(
      rawTrade({
        status: "open",
        direction: "short",
        stop: 110,
        target: 80,
        exit: null,
      }),
      "USD",
    );
    expect(previewRExit(short, "2", "5", "1").price).toBe("80");
    expect(
      previewRExit(
        {
          ...trade(),
          instrument: { ...trade().instrument, signedPrices: true },
        },
        "-11",
        "1",
        "1",
      ).price,
    ).toBe("-10");
  });
  it("uses explicit multipliers and non-English numeric entry", () => {
    const input = {
      ...rawTrade({ status: "open", exit: null }),
      instrument: { ...legacyInstrument("TEST"), multiplier: "100" },
    };
    expect(previewRExit(input, "۲", "۴", "۱").price).toBe("120");
  });
  it("produces break-even previews", () =>
    expect(previewRExit(trade(), 0, 1, 1).price).toBe("100"));
  it.each([
    { status: "planned" },
    { partialExits: [{ id: "old" }] },
    { fills: [{ id: "bad" }] },
  ])("rejects unavailable shortcuts %j", (change) =>
    expect(() => previewRExit({ ...trade(), ...change }, 1, 1, 1)).toThrow(),
  );
  it.each([
    [1, 11, 1],
    [1, 0, 1],
    [1, 1, 0],
    [-11, 1, 1],
    ["invalid", 1, 1],
  ])("rejects invalid fill inputs %j", (r, quantity, fx) =>
    expect(() => previewRExit(trade(), r, quantity, fx)).toThrow(),
  );
  it("counts existing exits against remaining quantity", () => {
    const fills = [
      {
        id: "fill",
        price: "110",
        quantity: "9",
        fxRate: "1",
        fees: "0",
        feeFxRate: "1",
        date: "",
        time: "",
      },
    ];
    expect(() => previewRExit({ ...trade(), fills }, 1, 2, 1)).toThrow();
  });
  it.each([{ priceIncrement: "3" }, { quantityIncrement: "3" }])(
    "checks instrument increments %j",
    (change) =>
      expect(() =>
        previewRExit(
          { ...trade(), instrument: { ...trade().instrument, ...change } },
          1,
          2,
          1,
        ),
      ).toThrow(),
  );
});
