// Static check: a function exported by one module and called in another must be imported (or defined) there.
// esbuild does not complain about a missing import: the call only fails at run time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".js")) files.push(p);
  }
})("src");

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

test("every called function exported elsewhere is imported or defined", () => {
  const exported = new Set();
  for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/export (?:async )?(?:function\*?|const|let|class) (\w+)/g)) exported.add(m[1]);
  const missing = [];
  for (const f of files) {
    const src = strip(readFileSync(f, "utf8"));
    const known = new Set();
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from/g)) for (const part of m[1].split(",")) known.add(part.trim().split(/\s+as\s+/).pop());
    for (const m of src.matchAll(/import\s+(\w+)\s+from/g)) known.add(m[1]);
    for (const m of src.matchAll(/(?:function\*?|const|let|var|class)\s+(\w+)/g)) known.add(m[1]);
    for (const m of src.matchAll(/(?:const|let|var)\s*\{([^}]+)\}\s*=/g)) for (const part of m[1].split(",")) known.add(part.trim().split(/\s*:\s*/).pop());
    // Parameters of functions and arrow functions.
    for (const m of src.matchAll(/function\s*\w*\s*\(([^)]*)\)|\(([^()]*)\)\s*=>|(\w+)\s*=>/g)) for (const part of (m[1] ?? m[2] ?? m[3]).split(",")) known.add(part.trim().replace(/^\.\.\./, "").split(/\s*=/)[0].trim());
    for (const name of exported) {
      if (known.has(name)) continue;
      if (new RegExp(`(?<![.\\w$])${name}\\s*\\(`).test(src)) missing.push(`${f}: ${name}() is called but not imported`);
    }
  }
  assert.deepEqual(missing, []);
});
