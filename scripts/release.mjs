import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import "./notices.mjs";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
let html = readFileSync("dist/index.html", "utf8").replace(/\r\n?/g, "\n");
const notices = readFileSync("THIRD-PARTY-NOTICES.txt", "utf8").replace(
  /<\/script/gi,
  "<\\/script",
);
html = html.replace(
  "</body>",
  '<script type="text/plain" id="edge-dependency-notices">' +
    notices +
    "</script></body>",
);
const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/text\/plain|application\/json/.test(match[1]))
  .map(
    (match) =>
      "'sha256-" + createHash("sha256").update(match[2]).digest("base64") + "'",
  );
const policy = [
  "default-src 'none'",
  "script-src " + hashes.join(" "),
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "worker-src blob:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");
html = html.replace(
  "<head>",
  '<head><meta name="application-version" content="' +
    version +
    '"><meta http-equiv="Content-Security-Policy" content="' +
    policy +
    '">',
);
writeFileSync("dist/index.html", html);
writeFileSync("index.html", html);
writeFileSync(
  "dist/release-manifest.json",
  JSON.stringify(
    {
      version,
      documentVersion: 13,
      sha256: createHash("sha256").update(html).digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
console.log("Portable artifact: " + Buffer.byteLength(html) + " bytes");
