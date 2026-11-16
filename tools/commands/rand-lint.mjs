// rand-lint [project]   opt-in lint of a film's own scripts (film/*.js, hf/*.js, record.mjs is not scanned): Math.random(), Date.now(), new Date(),
//                  performance.now(), requestAnimationFrame and setTimeout/setInterval make a frame depend on more than t. Each finding gets the fix:
//                  KIT.random(seed) (tools/timing.js, Remotion's random()) for random numbers, t for time. Comments and strings are ignored.
//                  Exit 1 when anything is found. Not part of `qa` (opt-in). docs/playbook/timing.md
import fs from "node:fs";
import path from "node:path";

const RULES = [
  [/\bMath\.random\s*\(/, "Math.random() gives a different frame on every render: use KIT.random('a-seed') (same seed, same number)"],
  [/\bDate\.now\s*\(|\bnew Date\s*\(|\bperformance\.now\s*\(/, "a clock is not a function of t: use t (the render(t) argument)"],
  [/\brequestAnimationFrame\s*\(|\bsetTimeout\s*\(|\bsetInterval\s*\(/, "frames are rendered out of order: nothing may run on a timer; set styles from t in render(t)"],
];
// blank out comments and string/template literals so a mention in text is not a finding (shortcut: regex literals containing quotes confuse it, fine for a lint)
export const strip = (src) => src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, (m) => m.replace(/[^\n]/g, " "));
export function lint(src) {
  const out = [], lines = strip(src).split("\n");
  lines.forEach((l, i) => { for (const [re, why] of RULES) if (re.test(l)) out.push({ line: i + 1, text: src.split("\n")[i].trim(), why }); });
  return out;
}
export default async ({ proj, args }) => {
  const dir = path.resolve(args[0] || proj || ".");
  const files = ["film", "hf"].flatMap((d) => { const p = path.join(dir, d); return fs.existsSync(p) ? fs.readdirSync(p).filter((f) => f.endsWith(".js") && !/^(kit|data|kit-vars|kit-data)/.test(f)).map((f) => path.join(p, f)) : []; });
  if (!files.length) { console.error(`rand-lint: no film/*.js or hf/*.js in ${dir}`); process.exit(1); }
  let n = 0;
  for (const f of files) for (const x of lint(fs.readFileSync(f, "utf8"))) { n++; console.log(`${path.relative(process.cwd(), f)}:${x.line}: ${x.why}\n    ${x.text}`); }
  if (n) { console.log(`rand-lint: ${n} finding${n === 1 ? "" : "s"}`); process.exit(1); }
  console.log(`rand-lint: ${files.length} file${files.length === 1 ? "" : "s"} clean`);
};
