// node fonts/fetch.mjs — (re)download the bundled fonts from Google Fonts and write fonts/LICENSES.md.
// Run only to add or update a family; the results are committed so builds never touch the network.
// Each family gets fonts/<slug>/<weight>.woff2 (latin subset) and its OFL.txt from github.com/google/fonts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
// family → weights the themes use (themes/*/theme.css)
const FAMILIES = {
  "Playfair Display": [700], "Source Serif 4": [400, 600],
  "Archivo Black": [400], "Space Mono": [400, 700],
  "Quicksand": [600, 700], "Nunito": [400, 700],
  "Space Grotesk": [500, 700], "JetBrains Mono": [400, 600],
  "Fredoka": [600],
  "Shrikhand": [400], "Work Sans": [400, 600],
  "Inter Tight": [700, 800], "Inter": [400, 600],
  "Cormorant Garamond": [500, 700], "Montserrat": [400, 600],
  "Manrope": [400, 700, 800],
  "Syne": [700, 800],
  "Caveat": [400, 700], "Patrick Hand": [400],
};
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const slug = (f) => f.toLowerCase().replace(/\s+/g, "-");
const get = async (url, as = "text") => {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return as === "text" ? r.text() : Buffer.from(await r.arrayBuffer());
};

const rows = [];
for (const [family, weights] of Object.entries(FAMILIES)) {
  const d = path.join(DIR, slug(family));
  fs.mkdirSync(d, { recursive: true });
  for (const w of weights) {
    const css = await get(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${w}&display=block`);
    // the css lists one block per unicode subset; keep latin
    const latin = css.split("/* ").find((b) => b.startsWith("latin */"));
    const url = latin?.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    if (!url) throw new Error(`no latin woff2 for ${family} ${w}`);
    fs.writeFileSync(path.join(d, `${w}.woff2`), await get(url, "buf"));
  }
  const dirName = family.toLowerCase().replace(/\s+/g, "");
  const ofl = await get(`https://raw.githubusercontent.com/google/fonts/main/ofl/${dirName}/OFL.txt`);
  fs.writeFileSync(path.join(d, "OFL.txt"), ofl);
  const copyright = ofl.split("\n").find((l) => /copyright/i.test(l))?.trim() || "";
  rows.push(`| ${family} | \`fonts/${slug(family)}/\` | ${weights.join(", ")} | SIL OFL 1.1 | ${copyright.replace(/\|/g, "/")} | ` +
    `[Google Fonts](https://fonts.google.com/specimen/${family.replace(/ /g, "+")}) |`);
  console.log(family, weights.join(","));
}
fs.writeFileSync(path.join(DIR, "LICENSES.md"), `# Bundled fonts

Every family here is licensed under the SIL Open Font License 1.1; its full text is in that family's \`OFL.txt\`.
Files are the latin-subset \`.woff2\` that Google Fonts serves, fetched ${new Date().toISOString().slice(0, 10)} by
\`node fonts/fetch.mjs\`. The OFL allows bundling and redistribution with software; the fonts may not be sold on their own.

| Family | Folder | Weights | License | Copyright | Source |
|---|---|---|---|---|---|
${rows.join("\n")}
`);
