// One-time migration helper. Running it again is idempotent.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");
const filename = "src/legacy/controller.js";
const ast = parse(readFileSync(filename, "utf8"), { sourceType: "module" });
traverse(ast, {
  CallExpression(path) {
    if (t.isIdentifier(path.node.callee, { name: "confirm" })) {
      path.node.callee = t.memberExpression(
        t.identifier("services"),
        t.identifier("confirm"),
      );
      const fn = path.getFunctionParent();
      if (fn) fn.node.async = true;
      path.replaceWith(t.awaitExpression(path.node));
      path.skip();
    }
  },
});
let changed = true;
while (changed) {
  changed = false;
  const asyncNames = new Set(["persist"]);
  traverse(ast, {
    Function(path) {
      if (!path.node.async) return;
      if (path.node.id) asyncNames.add(path.node.id.name);
      if (
        path.parentPath.isVariableDeclarator() &&
        t.isIdentifier(path.parentPath.node.id)
      )
        asyncNames.add(path.parentPath.node.id.name);
    },
  });
  traverse(ast, {
    CallExpression(path) {
      if (
        !t.isIdentifier(path.node.callee) ||
        !asyncNames.has(path.node.callee.name) ||
        path.parentPath.isAwaitExpression()
      )
        return;
      const fn = path.getFunctionParent();
      if (fn && !fn.node.async) {
        fn.node.async = true;
        changed = true;
      }
      path.replaceWith(t.awaitExpression(path.node));
      path.skip();
    },
  });
}
writeFileSync(
  filename,
  generate(ast, { comments: true, compact: false }).code + "\n",
);
