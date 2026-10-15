import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
const root = resolve("dist");
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const filename = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!filename.startsWith(root + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    const content = await readFile(filename);
    response.setHeader(
      "Content-Type",
      filename.endsWith(".html")
        ? "text/html; charset=utf-8"
        : "application/json",
    );
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(Number(process.env.PORT || 18850), "127.0.0.1");
