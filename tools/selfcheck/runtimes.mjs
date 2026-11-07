// node tools/selfcheck/runtimes.mjs [runtime…] — every tools/runtimes.js runtime (gsap, lottie, anime, three, css) gives the
// same pixels at the same t whatever order frames are seeked in. For each runtime and each renderer — pvk (file:// page,
// window.render(t)) and hyperframes (the kit copied into hf/kit/, served by the producer's own file server, which injects
// the HyperFrames runtime, its GSAP stub and the render bridge exactly as a render does; window.__hf.seek(t)) —
// page A seeks 12 times forward, page B (a fresh browser) the same times shuffled; every screenshot must match, and the
// frames must actually move. Writes a throwaway fixture in the OS temp folder.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { createFileServer } from "@hyperframes/producer";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const url = (...p) => pathToFileURL(path.join(ROOT, ...p)).href;
const W = 640, H = 360, DUR = 2, N = 12;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtimes-"));

// a 2 s Lottie made here (no third-party file): a rounded square that slides, turns and fades
const kf = (a, b) => ({ a: 1, k: [{ t: 0, s: a, i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } }, { t: 60, s: b }] });
const LOTTIE = { v: "5.7.0", fr: 30, ip: 0, op: 60, w: 320, h: 180, ddd: 0, assets: [], layers: [{ ddd: 0, ind: 1, ty: 4, nm: "box", sr: 1, ao: 0,
  ip: 0, op: 60, st: 0, bm: 0, ks: { o: kf([30], [100]), r: kf([0], [270]), p: kf([60, 90, 0], [260, 90, 0]), a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
  shapes: [{ ty: "gr", it: [{ ty: "rc", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [70, 70] }, r: { a: 0, k: 14 } },
    { ty: "fl", c: { a: 0, k: [0.18, 0.62, 0.42, 1] }, o: { a: 0, k: 100 } },
    { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] }] }] };

// per runtime: the scripts it needs (vendor-relative), and the film body; each uses several features of the library
const RT = {
  gsap: { libs: ["gsap/dist/gsap.min.js", "gsap/dist/SplitText.min.js", "gsap/dist/DrawSVGPlugin.min.js", "gsap/dist/MorphSVGPlugin.min.js",
      "gsap/dist/CustomEase.min.js", "gsap/dist/CustomWiggle.min.js", "gsap/dist/CustomBounce.min.js", "gsap/dist/TextPlugin.min.js",
      "gsap/dist/EasePack.min.js", "gsap/dist/Physics2DPlugin.min.js", "gsap/dist/PhysicsPropsPlugin.min.js"],
    film: `
const t1 = KIT.el('div', 'txt', S, 'Seek me anywhere'), box = KIT.el('div', 'box', S), out = KIT.el('div', 'txt2', S, '');
S.insertAdjacentHTML('beforeend', '<svg width="640" height="360" style="position:absolute;left:0;top:0"><path id="ln" d="M40 300 C200 200 440 380 600 280" stroke="#e33" stroke-width="8" fill="none"/><path id="m1" d="M500 60h80v80h-80z" fill="#36c"/><path id="m2" d="M540 50 L590 150 L490 150 Z" fill="none"/></svg>');
const h = KIT.gsap((tl, gsap) => {
  CustomWiggle.create('wig', { wiggles: 5, type: 'easeOut' }); CustomBounce.create('bnc', { strength: 0.6, squash: 2 });
  const chars = new SplitText(t1, { type: 'chars' }).chars;
  tl.fromTo(chars, { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: { each: 0.04, from: 'center' }, ease: 'back.out(2)' }, 0);
  tl.fromTo(box, { x: 0, rotation: 0 }, { x: 420, rotation: 30, duration: 1.4, ease: CustomEase.create('c', 'M0,0 C0.2,0.8 0.4,1 1,1') }, 0.2);
  tl.fromTo(box, { scale: 1 }, { scale: 1.4, duration: 1, ease: 'wig' }, 0.6);
  tl.fromTo('#ln', { drawSVG: '0% 0%' }, { drawSVG: '20% 100%', duration: 1.5 }, 0.1);
  tl.fromTo('#m1', { morphSVG: '#m1' }, { morphSVG: '#m2', duration: 1.2, ease: 'bnc' }, 0.4);
  const ball = KIT.el('div', 'dot', S); ball.style.top = '60px'; const pp = KIT.el('div', 'dot', S); pp.style.top = '100px';
  const ez = KIT.el('div', 'dot', S); ez.style.top = '140px';   // physics tweens read their start lazily: no other tween on their element
  tl.fromTo(ball, { x: 300, y: 0 }, { physics2D: { velocity: 300, angle: -60, gravity: 500 }, duration: 1.2 }, 0.3);
  tl.fromTo(pp, { x: 0 }, { physicsProps: { x: { velocity: 400, acceleration: -200 } }, duration: 1.5 }, 0.2);
  tl.fromTo(ez, { rotation: 0 }, { rotation: 180, duration: 1.6, ease: 'slow(0.5, 0.8, false)' }, 0.2);
  tl.fromTo(ez, { scale: 1 }, { scale: 3, duration: 1.4, ease: ExpoScaleEase.config(1, 3) }, 0.5);
  tl.fromTo(out, { text: '' }, { text: 'typed by TextPlugin', duration: 1.2, ease: 'none' }, 0.6);
});
KIT.start({ dur: ${DUR}, render: (t) => h.set(t) });` },
  lottie: { libs: ["lottie/lottie.min.js"],
    film: `
const a = KIT.lottie(KIT.el('div', 'full', S), ${JSON.stringify(LOTTIE)});
const b = KIT.lottie(KIT.el('div', 'half', S), ${JSON.stringify(LOTTIE)}, { t0: 0.3, speed: 1.7, loop: true, renderer: 'canvas' });
KIT.start({ dur: ${DUR}, render: (t) => { a.set(t); b.set(t); } });` },
  anime: { libs: ["anime/anime.umd.min.js"],
    film: `
for (let i = 0; i < 6; i++) KIT.el('div', 'dot', S).style.top = 40 + i * 50 + 'px';
const h = KIT.anime((A) => {
  const tl = A.createTimeline({ autoplay: false });
  tl.add('.dot', { x: [0, 460], rotate: [0, 180], scale: [{ to: 1.5, duration: 300 }, { to: 1, duration: 500 }], duration: 1200,
    delay: A.stagger(80, { from: 'center' }), ease: 'outElastic(1, .6)' }, 0);
  const late = KIT.el('div', 'box', S); late.style.top = '200px';   // a child that starts after 0: before it, the from-state
  tl.add(late, { scale: [0.2, 1], x: [0, 300], duration: 600, ease: 'outQuad' }, 900);
  return [tl, A.animate('.dot', { backgroundColor: ['#36c', '#e33'], borderRadius: ['0%', '50%'], duration: 1500, autoplay: false, ease: 'inOutSine' })];
});
KIT.start({ dur: ${DUR}, render: (t) => h.set(t) });` },
  three: { libs: [],
    film: `
const h = KIT.three(KIT.el('div', 'full', S), (THREE, renderer, { w, h }) => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  camera.position.set(0, 1.2, 6);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2); sun.position.set(3, 4, 5); scene.add(sun);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshStandardMaterial({ color: 0x2f9e6b, roughness: 0.4 }));
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.16, 120, 16), new THREE.MeshStandardMaterial({ color: 0xe0503a, metalness: 0.3 }));
  scene.add(cube, knot);
  return { scene, camera, update: (t) => {
    cube.rotation.set(t * 1.3, t * 2.1, 0); cube.position.x = -1.6 + t * 0.6;
    knot.rotation.y = t * 3; knot.position.set(1.6, Math.sin(t * 3) * 0.5, 0); camera.lookAt(0, 0, 0);
  } };
});
KIT.start({ dur: ${DUR}, render: (t) => h.set(t) });` },
  css: { libs: [],
    film: `
const st = document.createElement('style');
st.textContent = '@keyframes spin { from { transform: translateX(0) rotate(0) } to { transform: translateX(400px) rotate(300deg) } }' +
  '@keyframes glow { 0% { background: #36c } 50% { background: #e33 } 100% { background: #2f9e6b; border-radius: 50% } }' +
  '.box { animation: spin 1.6s cubic-bezier(.3,1.4,.6,1) 0.2s both, glow 1s ease-in-out 0.5s 2 alternate both }';
document.head.append(st);
KIT.el('div', 'box', S);
const w = KIT.el('div', 'dot', S); w.style.top = '260px';
w.animate([{ transform: 'translateX(0) scale(1)' }, { transform: 'translateX(520px) scale(2)', opacity: 0.4 }],
  { duration: 1300, delay: 300, easing: 'ease-out', fill: 'both', iterations: 1.5 });
KIT.start({ dur: ${DUR}, render: (t) => KIT.animations(t) });` },
};

const STYLE = `<style>body{margin:0;background:#f6f4ef}#stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;background:#f6f4ef;font:600 40px Arial,sans-serif}
#stage div{position:absolute}.txt{left:40px;top:30px}.txt2{left:40px;top:120px;font-size:28px}.box{left:40px;top:180px;width:80px;height:80px;background:#36c;border-radius:10px}
.dot{left:40px;width:30px;height:30px;background:#36c}.full{left:0;top:0;width:${W}px;height:${H}px}.half{left:320px;top:180px;width:320px;height:180px}</style>`;
const DATA = `<script>window.PROJECT = { fps: 30, width: ${W}, height: ${H}, speechEnd: ${DUR}, tail: 0 }; window.VO = {}; window.MUSIC = {};</script>`;
const film = (b) => `<script>'use strict'; const S = KIT.stage;${b}</script>`;

function fixture(rt) {
  const { libs, film: body } = RT[rt];
  const pvk = path.join(tmp, rt, "film"), hf = path.join(tmp, rt, "hf");
  fs.mkdirSync(pvk, { recursive: true }); fs.mkdirSync(hf, { recursive: true });
  fs.writeFileSync(path.join(pvk, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${url("tools", "kit.css")}">${STYLE}</head>` +
    `<body><div id="stage"></div>${DATA}<script src="${url("tools", "engine.js")}"></script>` +
    libs.map((l) => `<script src="${url("vendor", ...l.split("/"))}"></script>`).join("") +
    `<script src="${url("tools", "runtimes.js")}"></script>${film(body)}</body></html>`);
  copyKit(hf);
  fs.writeFileSync(path.join(hf, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/kit.css">${STYLE}</head>` +
    `<body><div id="root" data-composition-id="main" data-width="${W}" data-height="${H}"><div id="stage"></div></div>${DATA}` +
    `<script src="kit/engine.js"></script>` + libs.map((l) => `<script src="kit/${l}"></script>`).join("") +
    `<script src="kit/runtimes.js"></script>${film(body)}</body></html>`);
  return { pvk: path.join(pvk, "index.html"), hyperframes: path.join(hf, "index.html") };
}

const times = Array.from({ length: N }, (_, i) => +(DUR * i / (N - 1)).toFixed(4));
let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const shuffled = times.slice().sort(() => rnd() - 0.5);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);

async function shoot(file, renderer, order) {
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    const server = renderer === "pvk" ? null : await createFileServer({ projectDir: path.dirname(file), fps: 30 });
    closers.push(() => server && server.close());
    await p.goto(server ? server.url + "/index.html" : pathToFileURL(file).href);
    if (renderer === "pvk") assert.ok(await p.evaluate(() => window.READY), "READY was false");
    else {   // poll from node: the HyperFrames runtime takes over the page's timers, so page.waitForFunction never fires
      const ready = () => p.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0);
      for (let i = 0; !(await ready()); i++) { assert.ok(i < 300, "HyperFrames runtime never became ready: " + errs.join("; ")); await new Promise((r) => setTimeout(r, 100)); }
    }
    const out = {};
    for (const t of order) {
      if (renderer === "pvk") await p.evaluate((t) => window.render(t), t);
      else await p.evaluate(async (t) => { window.__hf.seek(t); await window.__hfWaitForSeekCompletion?.(); }, t);
      out[t] = await p.screenshot({ type: "png" });
    }
    assert.deepEqual(errs, [], `page errors in ${renderer}`);
    for (const t of order) out[t] = { sha: sha(out[t]), png: out[t] };
    return out;
  } finally { await browser.close(); while (closers.length) closers.pop()(); }
}
const closers = [];
// pixels off by more than NOISE/255 between two screenshots (decoded in a page: no image library in the repo)
const NOISE = 2, MAX_PIXELS = 64;   // .github/framediff.py: HyperFrames' software-raster noise on moving layers
let cmp;
async function offPixels(x, y) {
  cmp ||= await (await launch()).newPage();
  return cmp.evaluate(async ([x, y, n]) => {
    const px = async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
      const c = new OffscreenCanvas(im.width, im.height), g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const [a, b] = [await px(x), await px(y)];
    let off = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > n) off++;
    return off;
  }, [x.toString("base64"), y.toString("base64"), NOISE]);
}

// the QA gate tools/checks/seekable-runtimes.py: flags each banned path, passes the seekable patterns above
{
  const P = path.join(tmp, "lint"); fs.mkdirSync(path.join(P, "film"), { recursive: true });
  const bad = ["new SplitText(t, {}); tl.to(t, { scrambleText: 'x' })", "stagger: { each: 0.1, from: 'random' }", "ease: 'rough({ points: 20 })'",
    "CustomWiggle.create('w', { type: 'random' })", "gsap.utils.shuffle(a)", "anime.utils.random(0, 9)", "motionPath: { path: '#p' }",
    "tl.play()", "repeat: -1", "gsap.to('.a', { x: 1 })", "autoplay: true", "x: 'random(-100, 100)'", "lottie.loadAnimation({})",
    "const t2 = gsap.timeline()", "const c = new THREE.Clock()"];
  fs.writeFileSync(path.join(P, "film", "film.js"), [...bad, "// tl.play() in a comment", ...Object.values(RT).map((r) => r.film)].join("\n"));
  const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
  const r = spawnSync(PY, ["-c", "import importlib.util as u,sys;s=u.spec_from_file_location('c',sys.argv[1]);m=u.module_from_spec(s);s.loader.exec_module(m);" +
    "print('\\n'.join(m.check({'proj':sys.argv[2],'P':{}})))", path.join(ROOT, "tools/checks/seekable-runtimes.py"), P], { encoding: "utf8" });
  const lines = r.stdout.trim().split(/\r?\n/).filter(Boolean).map((l) => Number(l.split(":")[1]));
  assert.deepEqual([...new Set(lines)], bad.map((_, i) => i + 1), r.stdout + r.stderr);
  console.log(`PASS  seekable-runtimes gate: ${bad.length} banned paths flagged, comments and the fixtures above pass`);
}

const only = process.argv.slice(2);
let bad = 0;
try {
  for (const rt of Object.keys(RT).filter((r) => !only.length || only.includes(r))) {
    const files = fixture(rt);
    for (const renderer of ["pvk", "hyperframes"]) {
      const a = await shoot(files[renderer], renderer, times), b = await shoot(files[renderer], renderer, shuffled);
      // pvk re-rasters every frame (engine.js), so it must be byte-identical; hyperframes within its raster noise
      const diff = [], noisy = [];
      for (const t of times.filter((t) => a[t].sha !== b[t].sha)) {
        const off = renderer === "pvk" ? Infinity : await offPixels(a[t].png, b[t].png);
        (off > MAX_PIXELS ? diff : noisy).push(off === Infinity ? t : `${t} (${off} px)`);
      }
      const moving = new Set(times.map((t) => a[t].sha)).size, ok = !diff.length && moving >= N / 2;
      if (!ok) bad++;
      console.log(`${ok ? "PASS" : "FAIL"}  ${rt.padEnd(6)} ${renderer.padEnd(11)} ${N - diff.length - noisy.length}/${N} seeks identical` +
        (noisy.length ? `, ${noisy.length} within raster noise (≤ ${MAX_PIXELS} px off by > ${NOISE}/255: t = ${noisy.join(", ")})` : "") +
        `, ${moving} distinct frames` + (diff.length ? `; DIFFER at t = ${diff.join(", ")}` : "") + (moving < N / 2 ? "; barely moves (fixture broken?)" : ""));
    }
  }
} finally {
  if (cmp) await cmp.context().browser().close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (bad) { console.error(`runtimes self-check: ${bad} failed`); process.exit(1); }
console.log("runtimes self-check: every runtime deterministic under shuffled seeks in both renderers");
