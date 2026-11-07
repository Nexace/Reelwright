// node tools/selfcheck/themes.mjs — every themes/*.css passes tools/theme-check.mjs (tokens, #hex palette, bundled fonts),
// the themes ported from HyperFrames also have no contrast WARN and credit upstream, and there are at least 27 themes.
// Static (no browser): the rendered check is `node tools/theme-gallery.mjs`.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { checkTheme, allThemes } from "../theme-check.mjs";

const THEMES = path.resolve(fileURLToPath(new URL("../../themes", import.meta.url)));
const names = allThemes();
let ported = 0;
for (const n of names) {
  const { fail, warn } = checkTheme(n);
  assert.deepEqual(fail, [], `${n}: ${fail.join("; ")}`);
  if (/Ported from HyperFrames .*Apache-2\.0/.test(fs.readFileSync(path.join(THEMES, n + ".css"), "utf8"))) {
    ported++;
    assert.deepEqual(warn, [], `${n}: ${warn.join("; ")}`);
  }
}
assert.ok(names.length >= 27, `${names.length} themes, want ≥ 27`);
assert.ok(ported >= 16, `${ported} HyperFrames ports, want 16`);
console.log(`themes selfcheck OK: ${names.length} themes, ${ported} from HyperFrames`);
