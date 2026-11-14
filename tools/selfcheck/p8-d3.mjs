// node tools/selfcheck/p8-d3.mjs — d3 in a film: vendor/d3 loads from a pvk page and from the HyperFrames kit copy (hf/kit/d3/), and a scene built only
// from pure d3 pieces (scaleLinear, scaleSequential + interpolators, line, Delaunay/Voronoi, interpolateString) driven by render(t) gives identical
// pixels when seeked forward and shuffled, and moves. The d3-clock check (tools/checks/d3-clock.py) flags d3.transition / d3.timer / selection
// transitions and leaves KIT.transition and plain code alone. docs/playbook/d3.md's snippet is the one tested. Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p8-d3-"));
// the playbook's snippet, between its ```js markers
const md = fs.readFileSync(path.join(ROOT, "docs", "playbook", "d3.md"), "utf8");
const snippet = /```js\n([\s\S]*?)```/.exec(md)?.[1];
assert.ok(snippet && /render\(t\)/.test(snippet), "docs/playbook/d3.md has a js snippet with render(t)");

const page = (d3src) => `<!doctype html><body style="margin:0"><svg id=s width=320 height=180 xmlns="http://www.w3.org/2000/svg"></svg><script src="${d3src}"></script><script>
${snippet}
window.READY = Promise.resolve(true);</script></body>`;
const hf = path.join(tmp, "hf"); fs.mkdirSync(hf); copyKit(hf);
assert.ok(fs.existsSync(path.join(hf, "kit", "d3", "d3.min.js")), "d3 is copied into hf/kit/d3/");
fs.writeFileSync(path.join(tmp, "pvk.html"), page(pathToFileURL(path.join(ROOT, "vendor", "d3", "d3.min.js")).href));
fs.writeFileSync(path.join(hf, "index.html"), page("kit/d3/d3.min.js"));

const times = Array.from({ length: 10 }, (_, i) => +(i * 0.3).toFixed(2));
let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const shuffled = times.slice().sort(() => rnd() - 0.5);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 12);
const b = await launch(["--allow-file-access-from-files", "--force-device-scale-factor=1"]);
try {
  for (const file of [path.join(tmp, "pvk.html"), path.join(hf, "index.html")]) {
    const run = async (order) => {
      const p = await b.newPage({ viewport: { width: 320, height: 180 } }), errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      await p.goto(pathToFileURL(file).href); const o = {};
      for (const t of order) { await p.evaluate((t) => window.render(t), t); o[t] = sha(await p.screenshot({ type: "png" })); }
      await p.close(); assert.ok(!errs.length, errs.join("; ")); return o;
    };
    const a = await run(times), c = await run(shuffled);
    assert.deepEqual(c, a, `${path.basename(file)}: shuffled seeks differ`);
    assert.ok(new Set(Object.values(a)).size >= 5, `${path.basename(file)}: the scene does not move`);
  }
  // the d3-clock check
  const proj = path.join(tmp, "proj"); fs.mkdirSync(path.join(proj, "film"), { recursive: true });
  const check = (code) => { fs.writeFileSync(path.join(proj, "film", "film.js"), code);
    const r = spawnSync(PY, ["-c", `import importlib.util,json,sys\nspec=importlib.util.spec_from_file_location('c',${JSON.stringify(path.join(ROOT, "tools", "checks", "d3-clock.py"))});m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nprint(json.dumps(m.check({'proj':${JSON.stringify(proj)},'P':{}})))`], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };
  assert.equal(check(snippet + "\nKIT.transition('iris', { from: a, to: b });\n").length, 0, "the playbook snippet and KIT.transition pass");
  assert.equal(check("d3.select('#a').transition().duration(500).attr('x', 3);\n").length, 1);
  assert.equal(check("const t = d3.timer((e) => {});\nd3.interval(f, 100);\n").length, 2);
  assert.equal(check("// d3.timer is banned\n").length, 0, "comments are ignored");
  console.log("p8-d3 self-check: vendor/d3 loads on pvk and hf kit pages; the playbook scene is seek-pure and moving; the d3-clock check flags transitions and timers only");
} finally { await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
