// node tools/selfcheck/p14-face-install.mjs — `reelwright face install`: dry-run text, no download without --yes, venv-python selection (stub venv),
// and that no real install runs here (the --yes path is driven with a recording stub, never spawnSync). Nothing is installed or downloaded.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { faceInstall, facePython, venvPython, faceVenv } from "../measure_face.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p14-face-"));
try {
  process.env.REELWRIGHT_FACE_VENV = path.join(tmp, "venv");
  const calls = [], run = (c, a) => (calls.push([c, ...a]), { status: 0 });
  const go = (o) => { const out = []; const r = faceInstall({ ...o, log: (l) => out.push(l) }); return { out: out.join("\n"), r }; };

  // dry run / refusal without --yes: plan printed, nothing run
  let { out, r } = go({ run });
  assert.deepEqual(r, { ok: true, planned: true });
  assert.match(out, /opencv-python-headless/);
  assert.match(out, /uv venv /);
  assert.match(out, /uv pip install --python .*opencv-python-headless/);
  assert.match(out, /nothing downloaded: re-run with --yes to install/);
  assert.equal(calls.length, 0, "no command runs without --yes");

  // venv-python selection: absent -> system python, present -> the venv's
  assert.notEqual(facePython(), venvPython());
  fs.mkdirSync(path.dirname(venvPython()), { recursive: true });
  fs.writeFileSync(venvPython(), "");
  assert.equal(facePython(), venvPython());
  assert.equal(faceVenv(), path.join(tmp, "venv"));

  // --yes with a recording stub: both steps in order; a failing step stops with ok:false. The real spawn is never used here.
  ({ r } = go({ yes: true, run }));
  assert.equal(r.ok, true);
  assert.deepEqual(calls.map((c) => c.slice(0, 2).join(" ")), ["uv venv", "uv pip"]);
  calls.length = 0;
  ({ r } = go({ yes: true, run: (c, a) => (calls.push([c, ...a]), { status: 1 }) }));
  assert.equal(r.ok, false);
  assert.equal(calls.length, 1);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("p14-face-install ok: dry run, refusal without --yes, venv python selection, no real install attempted");
