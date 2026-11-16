// node tools/selfcheck/qa-lint.mjs — the source lints in tools/qa.py: hero-ease (a data-hero element on a generic
// easing keyword), scale-zero (WARN: an entrance starting at scale 0) and shot-shutter (KIT.shot.shutter without
// motion blur to spread, or outside 0–360). A film broken on purpose trips all three; a clean one passes; every
// committed film in projects/ still passes the new lints, so no existing output changes. Offline, no browser.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const QA = path.join(ROOT, 'tools', 'qa.py');
const PY = process.env.PYTHON || 'python3';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-lint-'));
const mk = (name, project, film) => {
  const dir = path.join(tmp, name);
  fs.mkdirSync(path.join(dir, 'film'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify(project));
  fs.writeFileSync(path.join(dir, 'film', 'index.html'), film);
  return dir;
};
const qa = (dir) => spawnSync(PY, [QA, dir, '--lints-only'], { cwd: ROOT, encoding: 'utf8' });

try {
  const bad = mk('bad', { out: 'out/film.mp4', fps: 10 },
    `<script>\nconst el = KIT.el('div', 'hero-card'); el.dataset.hero = '1';\nconst a = KIT.easing('ease');\nKIT.css(el, { transform: 'scale(0)' });\nKIT.shot.shutter(270, 1, 2);\n</script>`);
  let r = qa(bad);
  assert.equal(r.status, 1, 'the broken film must fail');
  assert.match(r.stdout, /FAIL  hero-ease[\s\S]*hero-card[\s\S]*enter \/ exit \/ ambient \/ impact/, 'hero-ease names the element and the intents');
  assert.match(r.stdout, /WARN  scale-zero: .*scale 0.*0\.93/, 'scale-zero warns with the 0.93 floor');
  assert.match(r.stdout, /FAIL  shot-shutter[\s\S]*motionBlur is off/, 'shot-shutter explains the no-op shutter');

  const clean = mk('clean', { out: 'out/film.mp4', fps: 10, motionBlur: true },
    `<script>\nconst el = KIT.el('div', 'hero-card'); el.dataset.hero = '1';\nconst a = KIT.easing('power3.out');\nKIT.css(el, { transform: 'scale(0.93)' });\nKIT.shot.shutter(270, 1, 2);\n</script>`);
  r = qa(clean);
  assert.equal(r.status, 0, 'a clean film must pass');
  assert.match(r.stdout, /PASS  hero-ease/); assert.match(r.stdout, /PASS  shot-shutter/); assert.doesNotMatch(r.stdout, /scale-zero/);

  const range = mk('range', { out: 'out/film.mp4', fps: 10, motionBlur: true }, `<script>KIT.shot.shutter(400, 1, 2);</script>`);
  r = qa(range);
  assert.equal(r.status, 1); assert.match(r.stdout, /outside 0–360/);

  const films = fs.readdirSync(path.join(ROOT, 'projects')).filter((d) => fs.existsSync(path.join(ROOT, 'projects', d, 'project.json')));
  assert.ok(films.length > 5, `want the committed films, found ${films.length}`);
  for (const f of films) {
    const p = path.join(ROOT, 'projects', f), out = qa(p);
    assert.equal(out.status, 0, `existing film ${f} must still pass the new lints:\n${out.stdout}${out.stderr}`);
  }
  console.log(`qa-lint self-check: hero-ease, scale-zero, shot-shutter trip on purpose; ${films.length} committed films still pass`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
