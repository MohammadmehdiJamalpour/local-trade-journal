import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run through npm run dependencies:check");
const direct =
  process.env.EDGE_JOURNAL_AUDIT_DIRECT === "1"
    ? ["--proxy=null", "--https-proxy=null"]
    : [];
const result = spawnSync(
  process.execPath,
  [npm, "audit", "--json", ...direct, ...process.argv.slice(2)],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
);
if (!result.stdout)
  throw new Error(result.stderr || "Audit service did not return a report");
const audit = JSON.parse(result.stdout);
if (audit.error || !audit.metadata)
  throw new Error(
    "Dependency audit unavailable: " + JSON.stringify(audit.error),
  );
mkdirSync("output", { recursive: true });
writeFileSync("output/dependency-audit.json", JSON.stringify(audit, null, 2));
const review = JSON.parse(readFileSync("docs/dependency-review.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const plugin = readFileSync(
  "node_modules/vite-plugin-singlefile/dist/esm/index.js",
  "utf8",
);
const config = readFileSync("vite.config.ts", "utf8");
let unreviewed = 0;
for (const [name, finding] of Object.entries(audit.vulnerabilities || {})) {
  if (!["critical", "high"].includes(finding.severity)) continue;
  const covered =
    review.packages.includes(name) &&
    finding.severity !== "critical" &&
    finding.nodes.every((path) => lock.packages[path]?.dev) &&
    finding.via.every((via) =>
      typeof via === "string"
        ? review.packages.includes(via)
        : via.url === review.advisory,
    ) &&
    Date.now() < Date.parse(review.expires) &&
    /inlinePattern:\s*\[\]/.test(config) &&
    plugin.includes("inlinePattern.length && !micromatch.isMatch");
  if (!covered) {
    console.error("Unreviewed high/critical dependency: " + name);
    unreviewed++;
  }
}
if (unreviewed) process.exitCode = 1;
else
  console.log(
    "Dependency review passed; " +
      audit.metadata.vulnerabilities.total +
      " findings reviewed. See docs/dependency-review.json.",
  );
