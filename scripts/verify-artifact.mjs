import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const html = readFileSync("index.html", "utf8");
assert.equal(
  html,
  readFileSync("dist/index.html", "utf8"),
  "Root artifact differs from generated artifact",
);
assert(
  !/<(?:script|link|img)\b[^>]*(?:src|href)=["'](?:https?:|\/assets\/|\.\/assets\/)/i.test(
    html,
  ),
  "External runtime resource",
);
assert(!/<script[^>]+src=/i.test(html), "Script was not embedded");
assert(html.includes("Content-Security-Policy"), "CSP missing");
const policy = html.match(
  /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i,
)?.[1];
assert(policy, "CSP must be embedded before executable content");
for (const required of [
  "default-src 'none'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
])
  assert(policy.includes(required), "Missing CSP boundary: " + required);
for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/text\/plain|application\/json/.test(script[1])) continue;
  const hash =
    "'sha256-" + createHash("sha256").update(script[2]).digest("base64") + "'";
  assert(policy.includes(hash), "Executable script lacks matching CSP hash");
}
for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
  assert(!/@import\b/i.test(style[1]), "CSS imports are not portable");
  for (const url of style[1].matchAll(/url\(\s*["']?([^\s"')]+)/gi))
    assert(
      /^(?:data:|blob:|#)/i.test(url[1]),
      "External or missing CSS asset: " + url[1].slice(0, 100),
    );
}
assert(
  !/<(?:iframe|object|embed|base)\b/i.test(html),
  "Executable embed or base URL",
);
const manifest = JSON.parse(readFileSync("dist/release-manifest.json", "utf8"));
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
assert.equal(
  manifest.version,
  version,
  "Manifest application version mismatch",
);
assert(
  html.includes('<meta name="application-version" content="' + version + '">'),
  "Portable application version mismatch",
);
assert.equal(
  manifest.sha256,
  createHash("sha256").update(html).digest("hex"),
  "Release manifest checksum mismatch",
);
assert(
  !/\beval\s*\(|\bnew Function\s*\(/.test(html),
  "Dynamic code evaluation",
);
assert(html.includes("edge-dependency-notices"), "Dependency notices missing");
console.log("Portable artifact verification passed");
