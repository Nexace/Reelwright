// node tools/selfcheck/qa.mjs — the delivered-file quality gate and the per-shot shutter.
//   • CAMBI runs on a real 1 s mp4 and prints a number per scene; VMAF runs only with output.master and prints one;
//   • with a fake ffmpeg that has no libvmaf both are SKIPPED (exit 0), never failed: the pipeline stays offline-safe;
//   • tools/motion-blur.mjs keeps 180°/8 samples by default; shotShutter only replaces a valid 0–360;
//     subFrameTimes is the old sub-frame formula; KIT.shot.shutterAt defaults to 180 and applies a registered window.
// Offline (the real ffmpeg part is skipped when the build has no libvmaf or no ffmpeg at all).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { blurSpec, shotShutter, subFrameTimes } from '../motion-blur.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const QA = path.join(ROOT, 'tools', 'qa.py');
const PY = process.env.PYTHON || 'python3';
const FFMPEG = process.env.REELWRIGHT_FFMPEG || 'ffmpeg';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-gate-'));
const project = (name, projectJson) => {
  const dir = path.join(tmp, name); fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify(projectJson));
  return dir;
};
const qa = (dir, env = {}) => spawnSync(PY, [QA, dir, '--quality-only'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env } });
const hasVmaf = (() => { const r = spawnSync(FFMPEG, ['-hide_banner', '-filters'], { encoding: 'utf8' }); return r.status === 0 && /libvmaf/.test(r.stdout || ''); })();

try {
  // ── the skip path: a build without libvmaf is a SKIP, not a FAIL ──
  if (process.platform !== 'win32') {
    const p = project('skip', { out: 'out/film.mp4', fps: 30 });
    const ff = path.join(tmp, 'ff-no-vmaf');
    fs.writeFileSync(ff, '#!/bin/sh\necho "Filters:"\n'); fs.chmodSync(ff, 0o755);
    const r = qa(p, { REELWRIGHT_FFMPEG: ff });
    assert.equal(r.status, 0, 'a build without libvmaf must not fail the gate');
    assert.match(r.stdout, /SKIP  cambi  \(this ffmpeg has no libvmaf/);
    assert.match(r.stdout, /SKIP  vmaf  \(this ffmpeg has no libvmaf/);
  }

  // ── the real gate: CAMBI per scene, VMAF against a master, both printing the number ──
  if (hasVmaf) {
    const p = project('real', { out: 'out/film.mp4', fps: 30, output: { master: 'master.mp4' } });
    const mp4 = path.join(p, 'out', 'film.mp4');
    const g = spawnSync(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30', '-frames:v', '30', '-pix_fmt', 'yuv420p', mp4], { encoding: 'utf8' });
    assert.equal(g.status, 0, `ffmpeg could not make the fixture: ${g.stderr}`);
    fs.copyFileSync(mp4, path.join(p, 'master.mp4'));
    const r = qa(p);
    assert.equal(r.status, 0, `a clean gradient must pass:\n${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /CAMBI  per scene: film [\d.]+ {2}\(max [\d.]+\)/, 'CAMBI prints a per-scene number');
    assert.match(r.stdout, /PASS  cambi  \(mean [\d.]+, max [\d.]+\)/);
    assert.match(r.stdout, /VMAF   per scene: film [\d.]+ {2}\(mean [\d.]+\)/, 'VMAF prints a per-scene number');
    assert.match(r.stdout, /PASS  vmaf  \(mean 9\d\.\d\)/, 'an identical master scores ~100');
    const noMaster = project('nomaster', { out: 'out/film.mp4', fps: 30 });
    fs.copyFileSync(mp4, path.join(noMaster, 'out', 'film.mp4'));
    const r2 = qa(noMaster);
    assert.equal(r2.status, 0); assert.match(r2.stdout, /SKIP  vmaf  \(no output\.master\)/);
  }

  // ── the default motion-blur spec and the sub-frame times are unchanged ──
  assert.deepEqual(blurSpec({}, 'auto'), { shutter: 180, samples: 8, linear: true });
  assert.deepEqual(blurSpec({ motionBlur: true }), { shutter: 180, samples: 8, linear: true });
  assert.deepEqual(shotShutter({ shutter: 180, samples: 8, linear: true }, 270), { shutter: 270, samples: 8, linear: true });
  assert.deepEqual(shotShutter({ shutter: 180, samples: 8, linear: true }, null), { shutter: 180, samples: 8, linear: true });
  assert.deepEqual(shotShutter({ shutter: 180, samples: 8, linear: true }, 400), { shutter: 180, samples: 8, linear: true });
  const ts = subFrameTimes(1, 60, { samples: 8, shutter: 180 });
  assert.deepEqual(ts, Array.from({ length: 8 }, (_, i) => Math.max(0, 1 + (i / 8 - 0.5) * 180 / 360 / 60)), 'sub-frame times are the old formula');

  // ── KIT.shot.shutter: 180° with nothing registered, the window otherwise ──
  const style = { setProperty() {}, getPropertyValue: () => '' };
  const el = (tag) => tag === 'canvas' ? { style: {}, getContext: () => ({ fillStyle: '' }) } : { style, set innerHTML(v) {}, appendChild() {}, setAttribute() {} };
  const window = {};
  const ctx = vm.createContext({ window, console, Math,
    document: { getElementById: () => null, documentElement: el(), body: el(), fonts: Object.assign([], { add() {}, ready: Promise.resolve() }),
      styleSheets: [], createElement: el, createElementNS: () => ({ style: {}, attrs: {}, kids: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.kids.push(c); } }) },
    getComputedStyle: () => style });
  for (const f of ['engine.js', 'shots.js', 'shutter.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8'), ctx);
  const S = window.KIT.shot;
  assert.equal(S.shutterAt(3), 180, 'no registration → the project default');
  S.shutter(270, 1, 2);
  assert.equal(S.shutterAt(1.5), 270, 'inside the window'); assert.equal(S.shutterAt(0.5), 180, 'before the window'); assert.equal(S.shutterAt(2), 180, 'after the window');
  S.shutter(90, { from: 4, to: 5 });
  assert.equal(S.shutterAt(4.5), 90, 'an options-object window');
  assert.throws(() => S.shutter(361), /0\.\.360/); assert.throws(() => S.shutter(90, 5, 4), /window/);
  assert.equal(window.__reelwrightShutter(1.5), 270, 'the renderer reads window.__reelwrightShutter');

  console.log(`qa self-check: CAMBI/VMAF ${hasVmaf ? 'numbers per scene' : 'skip path'}, 180°/8 default kept, per-shot shutter windows`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
