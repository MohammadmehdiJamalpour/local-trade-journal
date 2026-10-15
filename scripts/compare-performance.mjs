import { readFileSync } from "node:fs";
import { comparePerformance } from "./performance-gate.mjs";
const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath)
  throw new Error(
    "Usage: node scripts/compare-performance.mjs approved-baseline.json candidate.json",
  );
const baseline = JSON.parse(readFileSync(baselinePath, "utf8")),
  candidate = JSON.parse(readFileSync(candidatePath, "utf8"));
comparePerformance(baseline, candidate);
console.log(
  "No performance regression above 20% on the matching environment and protocol",
);
