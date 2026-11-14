// json <command> [project] [args…]   run any command and print ONE JSON envelope on stdout:
//                        { ok, command, args, exit, stdout, stderr, data?, _meta: { version, node, ms, update }, error?, did_you_mean? }
//                        exit codes: 0 ok, 1 the command failed (a FAIL gate, an error), 2 usage (unknown command or none: did_you_mean lists close names).
//                        `data` is the command's own output when it already prints JSON (catalog, doctor, compositions --json, …).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };

export function commandNames(ROOT) {
  const src = fs.readFileSync(path.join(ROOT, "bin", "reelwright.mjs"), "utf8");
  const builtin = [...src.matchAll(/^  (\w+)\(\) *\{/gm)].map((m) => m[1]);
  const plug = fs.readdirSync(path.join(ROOT, "tools", "commands")).filter((f) => f.endsWith(".mjs")).map((f) => f.slice(0, -4));
  return [...new Set([...builtin, ...plug])].sort();
}
export const didYouMean = (name, names) => names.filter((n) => n.startsWith(name.slice(0, 3)) || lev(name, n) <= Math.max(2, Math.floor(name.length / 3))).sort((a, b) => lev(name, a) - lev(name, b)).slice(0, 3);

export default async function cmd({ args, ROOT }) {
  const t0 = Date.now(), version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
  const meta = () => ({ version, node: process.version, ms: Date.now() - t0, update: null });   // update: no network here, so never a notice
  // the dispatcher already took a leading folder name (e.g. `json docs …`) as the project: re-read the raw words
  const [name, ...rest] = process.argv.slice(2).slice(1), names = commandNames(ROOT);
  const done = (o, code) => { console.log(JSON.stringify({ ...o, _meta: meta() })); process.exit(code); };
  if (!name) done({ ok: false, command: null, args: [], exit: 2, error: "usage: reelwright json <command> [project] [args…]", did_you_mean: [] }, 2);
  if (!names.includes(name) && name !== "help") done({ ok: false, command: name, args: rest, exit: 2, error: `unknown command "${name}"`, did_you_mean: didYouMean(name, names) }, 2);
  const r = spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), name, ...rest], { encoding: "utf8", cwd: ROOT, maxBuffer: 1 << 28 });
  const exit = r.status ?? 1, out = { ok: exit === 0, command: name, args: rest, exit, stdout: r.stdout, stderr: r.stderr };
  try { out.data = JSON.parse(r.stdout); } catch { /* plain text output */ }
  if (exit) out.error = (r.stderr.trim().split("\n").pop() || r.stdout.trim().split("\n").pop() || `exit ${exit}`).slice(0, 300);
  done(out, exit ? 1 : 0);
}
