import { describe, expect, it } from "vitest";
import { comparePerformance } from "../../scripts/performance-gate.mjs";

function report() {
  return {
    protocolVersion: 2,
    artifactSha256: "a".repeat(64),
    platform: "win32",
    cpu: "synthetic-cpu",
    browser: "155.0.0.0",
    samples: 20,
    measurements: [1000, 10000].map((count) => ({
      count,
      interactiveMs: Array<number>(20).fill(500),
      inputMs: Array<number>(20).fill(0.1),
      resultsMs: Array<number>(20).fill(150),
      reportMs: count === 10000 ? Array<number>(20).fill(80) : [],
    })),
    summary: [1000, 10000].map((count) => ({
      count,
      interactiveP95: 500,
      inputP95: 0.1,
      resultsP95: 150,
      ...(count === 10000 ? { reportP95: 80 } : {}),
    })),
  };
}
describe("release performance regression gate", () => {
  it("accepts a matching measured candidate and the exact 20% boundary", () => {
    const baseline = report(),
      candidate = report();
    candidate.measurements[0].interactiveMs.fill(600);
    candidate.summary[0].interactiveP95 = 600;
    expect(() => comparePerformance(baseline, candidate)).not.toThrow();
  });
  it("rejects a reproducible regression while retaining the raw samples", () => {
    const baseline = report(),
      candidate = report();
    candidate.measurements[0].interactiveMs.fill(601);
    candidate.summary[0].interactiveP95 = 601;
    expect(() => comparePerformance(baseline, candidate)).toThrow("regressed");
    expect(candidate.measurements[0].interactiveMs).toHaveLength(20);
  });
  it.each(["platform", "cpu", "browser"] as const)(
    "rejects a different %s",
    (key) => {
      const candidate = report();
      candidate[key] = "different";
      expect(() => comparePerformance(report(), candidate)).toThrow(
        "environment",
      );
    },
  );
  it("rejects comparisons across measurement protocols", () => {
    const candidate = { ...report(), protocolVersion: 1 };
    expect(() => comparePerformance(report(), candidate)).toThrow("protocol");
  });
  it.each(["measurements", "summary"] as const)(
    "rejects an omitted dataset in %s",
    (key) => {
      const candidate = report();
      candidate[key].pop();
      expect(() => comparePerformance(report(), candidate)).toThrow("datasets");
    },
  );
  it("rejects missing, nonfinite and undersampled observations", () => {
    for (const values of [[], [NaN], Array<number>(19).fill(500)]) {
      const candidate = report();
      candidate.measurements[0].interactiveMs = values;
      expect(() => comparePerformance(report(), candidate)).toThrow(
        "valid samples",
      );
    }
  });
  it("rejects summaries that disagree with their raw observations", () => {
    const candidate = report();
    candidate.summary[0].interactiveP95 = 1;
    expect(() => comparePerformance(report(), candidate)).toThrow(
      "raw samples",
    );
  });
  it("requires the measured artifact identity and the declared run count", () => {
    expect(() =>
      comparePerformance(report(), { ...report(), artifactSha256: "" }),
    ).toThrow("SHA-256");
    expect(() =>
      comparePerformance(report(), { ...report(), samples: 19 }),
    ).toThrow("Twenty");
  });
});
