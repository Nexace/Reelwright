// theme-brief "<what the product is>" [name]   draft themes/<name>.css from a one-line brief ("budgeting app for
//                  students"): the best-matching product type's palette, font pairing and mood from the ui-ux-pro-max
//                  data (vendor/ui-ux-pro-max, MIT), fonts mapped to the bundled OFL families; prints what it picked,
//                  what to avoid, and the theme check. Offline. Use with "style": "<name>" or --style <name>.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCSV } from "../beats.mjs";
import { draftTheme, themeCss } from "../theme_from.mjs";
import { checkTheme } from "../theme-check.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const read = (f) => {
  const [h, ...rows] = parseCSV(fs.readFileSync(path.join(ROOT, "vendor", "ui-ux-pro-max", f), "utf8"));
  return rows.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
};
// lower-case word stems ("budgeting" → "budget", "apps" → "app"), so a brief and the data meet halfway
const stem = (w) => w.length > 5 && w.endsWith("ing") ? w.slice(0, -3) : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
const words = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+/g) || []).map(stem));
// a match on a rare word (budget, meditation) beats one on a word every row has (app, platform): weight by log(N / rows with it)
const idf = (docs) => { const df = new Map(); for (const d of docs) for (const w of d) df.set(w, (df.get(w) || 0) + 1);
  return (w) => (df.has(w) ? Math.log(docs.length / df.get(w)) : 0); };
const bundled = (fam) => fs.existsSync(path.join(ROOT, "fonts", fam.toLowerCase().replace(/\s+/g, "-")));

// → { product, colors, why, type }: products/colors/ui-reasoning share rows (one per product type)
export function pick(brief) {
  const B = words(brief);
  const products = read("products.csv"), colors = read("colors.csv"), why = read("ui-reasoning.csv"), types = read("typography.csv");
  const P = products.map((p) => words(p.Keywords + " " + p["Product Type"])), wp = idf(P);
  const score = (j) => [...P[j]].filter((w) => B.has(w)).reduce((a, w) => a + wp(w), 0);
  let i = 0;
  P.forEach((_, j) => { if (score(j) > score(i) + 1e-9) i = j; });   // ties go to the earlier, more general row
  if (score(i) < 1) throw new Error(`no product type matches "${brief}" — name the kind of product (saas, fintech, fitness app, …)`);
  // fonts: the row's typography mood (and the brief) against each pairing's mood keywords, rare words weighted up
  const mood = new Set([...B, ...words(why[i].Typography_Mood + " " + why[i].Style_Priority)]);
  const T = types.map((t) => words(t["Mood/Style Keywords"] + " " + t["Best For"])), wt = idf(T);
  const fit = (j) => [...T[j]].filter((w) => mood.has(w)).reduce((a, w) => a + wt(w), 0) +
    0.5 * (bundled(types[j]["Heading Font"]) + bundled(types[j]["Body Font"]));   // prefer pairings that need no substitute
  let k = 0;
  T.forEach((_, j) => { if (fit(j) > fit(k) + 1e-9) k = j; });
  const type = types[k];
  return { product: products[i], colors: colors[i], why: why[i], type };
}

export function draft(brief) {
  const { product, colors: c, why, type } = pick(brief);
  const d = draftTheme({
    colors: { bg: [[c.Background, 1]], ink: [[c.Foreground, 1], [c["Muted Foreground"], 0.5]],
      accent: [[c.Primary, 1], [c.Accent, 0.8], [c.Secondary, 0.5]] },
    fonts: { display: { stack: type["Heading Font"], weight: 700 }, text: { stack: type["Body Font"] } },
  });
  d.notes.unshift(`product type: ${product["Product Type"]} (palette: ${product["Color Palette Focus"]})`,
    `font pairing: ${type["Font Pairing Name"]} — ${type["Mood/Style Keywords"]}`,
    ...(why.Anti_Patterns ? [`avoid: ${why.Anti_Patterns}`] : []));
  return d;
}

export default function ({ args }) {
  const [brief, name0] = args;
  if (!brief) { console.log('usage: reelwright theme-brief "<what the product is>" [name]'); process.exit(1); }
  let d;
  try { d = draft(brief); } catch (e) { console.error(e.message); process.exit(1); }
  const name = name0 || d.notes[0].slice(14).replace(/\s*\(.*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!/^[\w-]+$/.test(name)) { console.error(`theme name "${name}": use letters, digits, - and _`); process.exit(1); }
  const out = path.join(ROOT, "themes", name + ".css");
  if (fs.existsSync(out)) { console.error(`themes/${name}.css already exists — pick another name`); process.exit(1); }
  fs.writeFileSync(out, themeCss(name, `"${brief}" (ui-ux-pro-max data, MIT)`, d, "theme-brief"));
  const { fail, warn } = checkTheme(name);
  console.log(`themes/${name}.css (on ${d.base})\n  ${d.notes.join("\n  ")}`);
  for (const x of [...fail.map((f) => "FAIL " + f), ...warn.map((w) => "WARN " + w)]) console.log("  " + x);
  console.log(`use it: "style": "${name}" in project.json, or --style ${name}`);
}
