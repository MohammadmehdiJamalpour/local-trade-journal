const metrics = {
  interactiveP95: "interactiveMs",
  inputP95: "inputMs",
  resultsP95: "resultsMs",
  reportP95: "reportMs",
};
function validate(report) {
  if (report.samples !== 20)
    throw new Error("Twenty measured runs are required");
  if (
    (report.protocolVersion ?? 1) >= 2 &&
    !/^[a-f0-9]{64}$/.test(report.artifactSha256 ?? "")
  )
    throw new Error("The measured artifact SHA-256 is required");
  for (const key of ["measurements", "summary"])
    if (
      !Array.isArray(report[key]) ||
      report[key].length !== 2 ||
      ![1000, 10000].every(
        (count) =>
          report[key].filter((row) => row.count === count).length === 1,
      )
    )
      throw new Error("Exactly the 1000 and 10000 trade datasets are required");
  for (const row of report.summary) {
    const raw = report.measurements.find((item) => item.count === row.count);
    for (const [metric, samples] of Object.entries(metrics)) {
      if (metric === "reportP95" && row.count === 1000) continue;
      const values = raw[samples];
      if (
        !Array.isArray(values) ||
        values.length !== 20 ||
        values.some((value) => !Number.isFinite(value) || value < 0)
      )
        throw new Error(row.count + "/" + metric + " needs 20 valid samples");
      const p95 = [...values].sort((a, b) => a - b)[18];
      if (
        !Number.isFinite(row[metric]) ||
        Math.abs(row[metric] - p95) > 0.000001
      )
        throw new Error(
          row.count + "/" + metric + " disagrees with raw samples",
        );
    }
  }
}
export function comparePerformance(baseline, candidate) {
  validate(baseline);
  validate(candidate);
  if ((baseline.protocolVersion ?? 1) !== (candidate.protocolVersion ?? 1))
    throw new Error(
      "Measurement protocol differs; retain the old report and review a baseline measured with the same protocol.",
    );
  if (
    baseline.platform !== candidate.platform ||
    baseline.cpu !== candidate.cpu ||
    baseline.browser.split(".")[0] !== candidate.browser.split(".")[0]
  )
    throw new Error(
      "Benchmark environment differs; a matching baseline is required",
    );
  const regressions = [];
  for (const row of candidate.summary) {
    const old = baseline.summary.find((item) => item.count === row.count);
    for (const key of Object.keys(metrics))
      if (old[key] != null && row[key] > Math.max(old[key], 1) * 1.2)
        regressions.push(row.count + "/" + key + " regressed more than 20%");
  }
  if (regressions.length) throw new Error(regressions.join("; "));
}
