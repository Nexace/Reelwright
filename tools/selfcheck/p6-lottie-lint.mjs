// node tools/selfcheck/p6-lottie-lint.mjs — row doodle-shots-motion:5.5: the qa scan for Lottie expressions.
// 1. tools/checks/lottie-expressions.py (gate) flags wiggle / random in a Lottie JSON and in a film script's inline copy, and
//    passes time-driven expressions; lottie-expressions-info.py (warn) reports any expression.
// 2. The measurement behind the gate: wiggle and random give different frames on fresh page loads, a time expression never does.
// 3. No committed project trips the gate.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { ROOT } from "./p6-harness.mjs";
import { samples } from "./p6/lottie-samples.mjs";

const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const run = (name, proj) => {
  const code = `import importlib.util,sys,json\ns=importlib.util.spec_from_file_location('c',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint(json.dumps([m.KIND,list(m.check({'proj':sys.argv[2]}))]))`;
  const r = spawnSync(PY, ["-I", "-c", code, path.join(ROOT, "tools", "checks", name + ".py"), proj], { encoding: "utf8", cwd: ROOT });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p6lint-"));
const proj = (name, files) => { const d = path.join(tmp, name); fs.mkdirSync(path.join(d, "film"), { recursive: true });
  for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(d, "film", f), typeof c === "string" ? c : JSON.stringify(c)); return d; };
try {
  const cases = [
    ["plain", { "a.json": samples.shapes }, 0, 0],
    ["time expression", { "a.json": samples.expressions }, 0, 1],
    ["wiggle", { "a.json": samples.wiggle }, 1, 0],
    ["random", { "a.json": samples.random }, 1, 0],
    ["inline wiggle", { "film.js": `const L = ${JSON.stringify(samples.wiggle)};` }, 1, 0],
    ["not lottie", { "data.json": { x: "wiggle(1,2)", k: 1 } }, 0, 0],
  ];
  for (const [name, files, gate, info] of cases) {
    const d = proj(name.replace(/ /g, "-"), files);
    const [gk, g] = run("lottie-expressions", d), [ik, i] = run("lottie-expressions-info", d);
    assert.equal(gk, "gate"); assert.equal(ik, "warn");
    assert.equal(g.length, gate, `${name}: gate lines ${JSON.stringify(g)}`); assert.equal(i.length, info, `${name}: info lines ${JSON.stringify(i)}`);
    console.log(`PASS  lint ${name.padEnd(16)} gate ${g.length}, warn ${i.length}`);
  }

  // measurement: transform of the animated layer at t = 1 on three fresh loads
  const u = (p) => pathToFileURL(path.join(ROOT, p)).href;
  for (const [name, varies] of [["wiggle", true], ["random", true], ["expressions", false]]) {
    const f = path.join(tmp, name + ".html");
    fs.writeFileSync(f, `<!doctype html><link rel=stylesheet href="${u("tools/kit.css")}"><style>#stage > .full{left:0;top:0;width:640px;height:360px}</style><body><div id=stage></div>` +
      `<script>window.PROJECT={fps:30,width:640,height:360,speechEnd:2,tail:0};window.VO={};window.MUSIC={}</script><script src="${u("tools/engine.js")}"></script>` +
      `<script src="${u("vendor/lottie/lottie.min.js")}"></script><script src="${u("tools/runtimes.js")}"></script>` +
      `<script>const lot=KIT.lottie(KIT.el('div','full',KIT.stage),${JSON.stringify(samples[name])});KIT.start({dur:2,render:(t)=>lot.set(t)});</script>`);
    const seen = new Set();
    for (let k = 0; k < 3; k++) {
      const b = await launch(["--allow-file-access-from-files"]);
      try {
        const p = await b.newPage({ viewport: { width: 640, height: 360 } });
        await p.goto(pathToFileURL(f).href); assert.ok(await p.evaluate(() => window.READY));
        await p.evaluate((t) => window.render(t), 1);
        seen.add(await p.evaluate(() => document.querySelector("#stage svg g g").getAttribute("transform")));
      } finally { await b.close(); }
    }
    assert.equal(seen.size > 1, varies, `${name}: ${seen.size} distinct transforms over 3 loads (expected ${varies ? "more than 1" : "exactly 1"})`);
    console.log(`PASS  measured ${name.padEnd(12)} ${seen.size} distinct transform(s) over 3 fresh loads`);
  }

  // no committed project trips the gate
  for (const d of fs.readdirSync(path.join(ROOT, "projects"))) {
    const [, g] = run("lottie-expressions", path.join(ROOT, "projects", d));
    assert.deepEqual(g, [], `${d} trips the lottie-expressions gate`);
  }
  console.log("PASS  no project in projects/ trips the gate");
  console.log("p6-lottie-lint ok");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
