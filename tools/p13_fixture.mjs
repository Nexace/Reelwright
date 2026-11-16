// tools/p13_fixture.mjs — a tiny offline hyperframes film for the p13-* self-checks: a temp copy of projects/example-hf (tracked
// files only: project.json + hf/{index.html,film.js,blocks}), small and slow (480x270 at 10 fps) with a fake vo/lines.json (each
// word 0.3 s, what tools/vo.py would write) so `sched` and `info` run with no network and no TTS. → { dir, P, run(...args) }
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

export function tinyFilm(patch = {}, lines = 4) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "p13-"))), src = path.join(ROOT, "projects", "example-hf");
  fs.mkdirSync(path.join(dir, "hf"), { recursive: true }); fs.mkdirSync(path.join(dir, "vo"));
  for (const f of ["index.html", "film.js", "blocks"]) fs.cpSync(path.join(src, "hf", f), path.join(dir, "hf", f), { recursive: true });
  const P = { ...JSON.parse(fs.readFileSync(path.join(src, "project.json"), "utf8")), width: 480, height: 270, fps: 10, ...patch };
  P.lines = P.lines.slice(0, lines); delete P.langs; delete P.ci;
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify(P, null, 2));
  const voiced = {};
  for (const l of P.lines) {
    const words = l.text.split(" ").map((w, i) => ({ w, t: +(i * 0.3).toFixed(2), d: 0.25 }));
    voiced[l.id] = { text: l.text, key: "fake", dur: +(words.length * 0.3).toFixed(2), words };
  }
  fs.writeFileSync(path.join(dir, "vo", "lines.json"), JSON.stringify(voiced));
  const run = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), ...a.map((x) => (x === "@" ? dir : x))],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, PAGES: "2" } });
  return { dir, P, run, rm: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
