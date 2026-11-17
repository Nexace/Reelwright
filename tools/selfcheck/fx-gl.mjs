// node tools/selfcheck/fx-gl.mjs — the WebGL2 half of the Remotion effects work: tools/fx-gl.js on DOM elements and the 12 HTML-in-canvas
// presentations (tools/renderers/shader_glsl2.mjs) as KIT.shader transitions, i.e. the path that only exists in tools/renderers/shader_pass.mjs.
// Two parts:
//   1. the source path (KIT.fx.<name>(canvas)) runs through the shared p9 harness with the fixtures in tools/selfcheck/fx-gl/ — seek-pure under
//      shuffled seeks in pvk and hyperframes, plus the pixel assertions in that fixture's check();
//   2. here: a film with a pageTurn and an outline on DOM elements and all 12 transitions, passed through shaderPass twice. Both runs must be
//      byte-identical (the pass is a pure function of the frames), every transition frame must be a different picture, and three effects must
//      answer at an exact pixel: pageTurn peels the page off the layer below, outline paints outside its element, book-flip splits the frame.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { shaderPass } from "../renderers/shader_pass.mjs";
import { SHADERS2 } from "../renderers/shader_glsl2.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const W = 320, H = 180, NAMES = Object.keys(SHADERS2);
const url = (rel) => pathToFileURL(path.join(ROOT, ...rel.split("/"))).href;
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);

// 1. the source path: fixtures in tools/selfcheck/fx-gl/, both renderers (the harness prints its own PASS lines)
const sub = spawnSync(process.execPath, [path.join(ROOT, "tools", "selfcheck", "remotion-kit.mjs")],
  { cwd: ROOT, stdio: "inherit", env: { ...process.env, P9_FIXTURES: path.join(ROOT, "tools", "selfcheck", "fx-gl") } });
if (sub.status !== 0) { console.error("fx-gl: the source-effect fixtures failed"); process.exit(1); }

// 2. the renderer path: DOM-element effects + every shader transition, twice, through shaderPass
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fxgl-"));
const film = `
const box = (css) => { const e = KIT.el('div', '', S); KIT.css(e, { position: 'absolute', left: '0px', top: '0px', ...css }); return e; };
const A = box({ width: '${W}px', height: '${H}px', background: '#36c' });
const B = box({ width: '${W}px', height: '${H}px', background: '#e0a030', opacity: '0' });
const Q = box({ left: '60px', top: '50px', width: '35px', height: '35px', background: '#ffe000' });   // under P: what pageTurn peels to
const P = box({ width: '100px', height: '90px', background: '#7a4fff' });
const O = box({ left: '200px', top: '10px', width: '70px', height: '50px', background: '#ffffff' });
KIT.fx.pageTurn(P, { at: [0, 1], foldPosition: [0.5, 0.5], foldDirection: 315, foldRadius: 20 });
KIT.fx.outline(O, { at: [1, 2], width: 12, color: '#ff0000' });
${JSON.stringify(NAMES)}.forEach((n, i) => KIT.shader(A, B, { shader: n, t: 2 + i, dur: 0.6 }));
KIT.start({ dur: ${2 + NAMES.length + 1}, render: () => { KIT.show(A, 1); KIT.show(B, 0); } });`;
const page = path.join(tmp, "index.html");
fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools/kit.css")}"></head>` +
  `<body style="margin:0"><div id="stage"></div>` +
  `<script>window.PROJECT={fps:30,width:${W},height:${H},speechEnd:${2 + NAMES.length + 1},tail:0};window.VO={};window.MUSIC={};</script>` +
  ["tools/engine.js", "tools/fx-color.js", "tools/fx-gl.js", "tools/shaders.js"].map((s) => `<script src="${url(s)}"></script>`).join("") +
  `<script>'use strict'; const S = KIT.stage;\n${film}\n</script></body></html>`);

const times = [0.5, 1.5, ...NAMES.map((_, i) => +(2 + i + 0.3).toFixed(4))];
const run = async (dir) => {
  fs.mkdirSync(dir, { recursive: true });
  const frames = times.map((t, i) => ({ t, file: path.join(dir, `${i}.png`) }));
  for (const f of frames) fs.writeFileSync(f.file, "");
  await shaderPass(page, W, H, frames, 1);
  return frames.map((f) => fs.readFileSync(f.file));
};

let browser, cmp;
const px = async (png, x, y) => {
  cmp ||= await (browser = await launch()).newPage();
  return cmp.evaluate(async ([b64, x, y]) => {
    const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
    const g = new OffscreenCanvas(im.width, im.height).getContext("2d"); g.drawImage(im, 0, 0);
    return [...g.getImageData(x, y, 1, 1).data];
  }, [png.toString("base64"), x, y]);
};
const bad = [], want = (what, ok, got) => { if (!ok) bad.push(what + ": " + JSON.stringify(got)); };
try {
  const a = await run(path.join(tmp, "a")), b = await run(path.join(tmp, "b"));
  for (const i of times.keys()) want(`frame ${times[i]} is byte-identical on a second pass`, sha(a[i]) === sha(b[i]), [sha(a[i]), sha(b[i])]);
  // pageTurn on the purple page over a yellow box: the far side of the fold is gone, the near side is still the page
  let v = await px(a[0], 10, 10); want("pageTurn keeps the page before the fold", v[0] > 90 && v[2] > 180 && v[1] < 110, v);
  v = await px(a[0], 90, 80); want("pageTurn peels the page off the layer below", v[0] > 230 && v[1] > 190 && v[2] < 60, v);
  v = await px(a[0], 120, 10); want("pageTurn leaves the rest of the frame alone", v[2] > 180 && v[0] < 90, v);
  // outline 12 px on a white box over the blue scene
  v = await px(a[1], 194, 35); want("outline paints 6 px outside its element", v[0] > 240 && v[1] < 40 && v[2] < 40, v);
  v = await px(a[1], 184, 35); want("outline stops at its width", v[2] > 180 && v[0] < 90, v);
  v = await px(a[1], 235, 35); want("outline keeps the element itself", v[0] > 240 && v[1] > 240 && v[2] > 240, v);
  // all 12 transitions: a different picture each, and book-flip (p = 0.5) hands the left half to `from`, the right half to `to`
  const tr = a.slice(2), hashes = tr.map(sha);
  want(`all ${NAMES.length} transitions draw a different frame`, new Set(hashes).size === NAMES.length, hashes.length - new Set(hashes).size + " repeats");
  const i0 = 2 + NAMES.indexOf("book-flip");
  v = await px(a[i0], 40, 140); want("book-flip keeps `from` on the left of the spine", v[2] > 150 && v[0] < 110, v);
  v = await px(a[i0], 280, 140); want("book-flip shows `to` on the right of the spine", v[0] > 200 && v[2] < 90, v);
} finally {
  if (cmp) await cmp.context().browser().close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (bad.length) { console.error("fx-gl: the renderer pass failed\n  " + bad.join("\n  ")); process.exit(1); }
console.log(`fx-gl: ${NAMES.length} transitions and 2 DOM effects deterministic through shaderPass, ${times.length} frames each pass`);
