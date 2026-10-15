import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCSV, csvEscape, csvUnescape } from "../../src/portability/csv";
afterEach(() => vi.unstubAllGlobals());
describe("CSV boundary", () => {
  it("preserves Unicode, quotes, newlines, empty fields and BOM across round trips", () => {
    const values = [
      "ژورنال",
      "a,b",
      'a"b',
      "line\nnext",
      "",
      "normal",
      "end\r\nrow",
    ];
    expect(
      parseCSV("\uFEFF" + values.map(csvEscape).join(",") + "\r\n\r\n")[0].map(
        csvUnescape,
      ),
    ).toEqual(values);
    expect(parseCSV("a,b\rc,d\n1,2")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["1", "2"],
    ]);
    expect(csvEscape(null)).toBe('""');
    expect(csvUnescape(undefined)).toBe("");
  });
  it.each([
    "=SUM(A1)",
    "+cmd",
    "-5",
    "@thing",
    '\t=HYPERLINK("x")',
    "  =cmd",
    "\nunsafe",
    "'literal",
    "''quoted",
  ])("neutralizes formula text %j reversibly", (value) => {
    expect(csvEscape(value)).toMatch(/^"'/);
    expect(csvUnescape(parseCSV(csvEscape(value))[0][0])).toBe(value);
  });
  it("keeps actual negative numbers numeric and rejects malformed quoted fields", () => {
    expect(csvEscape(-5)).toBe('"-5"');
    expect(csvUnescape("plain")).toBe("plain");
    for (const value of ['"unclosed', 'a"b', '"a"b'])
      expect(() => parseCSV(value)).toThrow();
  });
  it("parses large-file worker messages and contains parser failures", async () => {
    const target = {
      postMessage: vi.fn(),
      onmessage: undefined as ((event: MessageEvent) => void) | undefined,
    };
    vi.stubGlobal("self", target);
    await import("../../src/portability/parser.worker");
    target.onmessage!({ data: { text: "a,b", format: "csv" } } as MessageEvent);
    expect(target.postMessage).toHaveBeenLastCalledWith({
      value: [["a", "b"]],
    });
    target.onmessage!({
      data: { text: '{"a":1}', format: "json" },
    } as MessageEvent);
    expect(target.postMessage).toHaveBeenLastCalledWith({ value: { a: 1 } });
    target.onmessage!({
      data: { text: "broken", format: "json" },
    } as MessageEvent);
    expect(target.postMessage).toHaveBeenLastCalledWith({
      error: expect.any(String),
    });
  });
});
