import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g,
  ],
  ["AWS access key", /\bAKIA[A-Z0-9]{16}\b/g],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/g],
];
const files = [
  ...new Set(
    execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean),
  ),
];
let count = 0;
for (const file of files) {
  if (!statSync(file).isFile()) continue;
  const text = readFileSync(file, "utf8");
  for (const [name, pattern] of rules)
    for (const match of text.matchAll(pattern)) {
      console.error(
        file +
          ":" +
          text.slice(0, match.index).split("\n").length +
          ": possible " +
          name,
      );
      count++;
    }
}
if (count) process.exitCode = 1;
else
  console.log(
    "Secret scan passed (" +
      files.length +
      " files; high-confidence patterns only)",
  );
