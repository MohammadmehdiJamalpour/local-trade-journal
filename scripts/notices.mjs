import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const sections = [];
for (const [path, metadata] of Object.entries(lock.packages).sort(([a], [b]) =>
  a < b ? -1 : a > b ? 1 : 0,
)) {
  if (!path || metadata.dev) continue;
  const packageFile = join(path, "package.json");
  if (!existsSync(packageFile)) continue;
  const pkg = JSON.parse(readFileSync(packageFile, "utf8"));
  const licenseFile = [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "license",
    "LICENCE",
  ]
    .map((name) => join(path, name))
    .find(existsSync);
  sections.push(
    pkg.name +
      " " +
      pkg.version +
      "\nLicense: " +
      (pkg.license || metadata.license || "See upstream package") +
      "\n" +
      (licenseFile
        ? readFileSync(licenseFile, "utf8").replace(/\r\n?/g, "\n").trim()
        : ""),
  );
}
sections.push(
  "Vazirmatn\nSIL Open Font License 1.1\nThe original font attribution and license remain in the embedded stylesheet.",
);
writeFileSync(
  "THIRD-PARTY-NOTICES.txt",
  sections.join("\n\n" + "-".repeat(72) + "\n\n") + "\n",
);
writeFileSync(
  "dist/dependency-inventory.json",
  JSON.stringify(
    Object.fromEntries(
      Object.entries(lock.packages)
        .filter(([path, item]) => path && !item.dev)
        .map(([path, item]) => [
          path,
          {
            version: item.version,
            integrity: item.integrity,
            license: item.license,
          },
        ]),
    ),
    null,
    2,
  ) + "\n",
);
