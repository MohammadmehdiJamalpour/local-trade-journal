import { describe, expect, it } from "vitest";
import { modernRecordIssues } from "../../src/domain/boundaries";
import { rawTrade } from "../fixtures/journal";
describe("modern identity and text imports", () => {
  it("accepts existing bounded Unicode text", () =>
    expect(
      modernRecordIssues({
        version: 13,
        trades: [rawTrade({ notes: "یادداشت فارسی\nUnicode" })],
      }),
    ).toEqual([]));
  it("retains legacy adaptation for older documents", () =>
    expect(
      modernRecordIssues({ version: 11, trades: [rawTrade({ notes: 123 })] }),
    ).toEqual([]));
  it.each([
    ["id", 100],
    ["accountId", 100],
    ["symbol", 24],
    ["openDate", 16],
    ["closeDate", 16],
    ["openTime", 8],
    ["closeTime", 8],
    ["entryReason", 1200],
    ["exitReason", 1000],
    ["lesson", 1000],
    ["screenshotRef", 500],
    ["notes", 3000],
    ["createdAt", 40],
    ["updatedAt", 40],
  ] as const)("quarantines oversized %s without truncation", (field, limit) => {
    const raw = rawTrade({ [field]: "x".repeat(limit + 1) });
    const result = modernRecordIssues({
      version: 13,
      trades: [rawTrade(), raw],
    });
    expect(result).toHaveLength(1);
    expect(result[0].index).toBe(1);
    expect(result[0].raw).toBe(raw);
    expect(result[0].reasons[0]).toContain(field);
  });
  it.each([null, false, 123, {}, []])("rejects wrong text types %j", (notes) =>
    expect(
      modernRecordIssues({ version: 13, trades: [rawTrade({ notes })] }),
    ).toHaveLength(1),
  );
});
