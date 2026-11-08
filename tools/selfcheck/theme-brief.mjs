// node tools/selfcheck/theme-brief.mjs — `reelwright theme-brief` picks a sensible product type and font pairing for a
// few briefs, maps every font to a bundled family, and writes a theme the theme check passes (no FAIL). Offline.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { pick, draft } from "../commands/theme-brief.mjs";
import { themeCss } from "../theme_from.mjs";
import { checkTheme } from "../theme-check.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const CASES = [
  ["luxury hotel booking", /Luxury/, /Luxury/],
  ["fitness tracker", /Fitness/, /Fitness/],
  ["developer CLI tool for databases", /Developer/, /Terminal|Mono/],
  ["restaurant ordering", /Restaurant/, /Restaurant/],
  ["meditation and sleep app", /Meditation/, /./],
];
for (const [brief, prod, font] of CASES) {
  const r = pick(brief);
  assert.match(r.product["Product Type"], prod, `${brief}: product ${r.product["Product Type"]}`);
  assert.match(r.type["Font Pairing Name"], font, `${brief}: fonts ${r.type["Font Pairing Name"]}`);
}
assert.throws(() => pick("qwerty zxcv"), /no product type matches/);

const name = "zz-selfcheck-brief", out = path.join(ROOT, "themes", name + ".css");
try {
  const d = draft("luxury hotel booking");
  for (const fam of Object.values(d.fonts)) assert.ok(fs.existsSync(path.join(ROOT, "fonts", fam.toLowerCase().replace(/\s+/g, "-"))), `${fam} not bundled`);
  fs.writeFileSync(out, themeCss(name, '"luxury hotel booking"', d, "theme-brief"));
  const { fail } = checkTheme(name);
  assert.deepEqual(fail, [], fail.join("; "));
} finally { fs.rmSync(out, { force: true }); }
console.log(`theme-brief self-check: ${CASES.length} briefs matched, fonts bundled, drafted theme passes the theme check`);
