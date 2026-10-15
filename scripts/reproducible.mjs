import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const build = () => {
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    stdio: "inherit",
  });
  execFileSync(process.execPath, ["scripts/release.mjs"], { stdio: "inherit" });
  return createHash("sha256").update(readFileSync("index.html")).digest("hex");
};
const first = build(),
  second = build();
if (first !== second)
  throw new Error("Identical inputs produced different portable bytes");
console.log("Two clean builds match: " + second);
