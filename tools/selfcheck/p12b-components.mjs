// node tools/selfcheck/p12b-components.mjs — E2: asset-bearing HyperFrames components (tools/component_assets.mjs).
// All 9 are found; the 7 whose assets exist locally install with them (five hw-* with the repo's Caveat; caption-texture and
// texture-mask-text with generated stand-in textures, byte-identical on every run); each is then loaded in Chromium as KIT.block
// loads it (html inlined, scripts re-created) and must register its timeline, load its font or its textures, throw nothing and
// request nothing that fails. The other 2 (Geist, Permanent Marker + Courier Prime need font files that are not in the repo) are
// refused with the exact reason and write nothing. No network.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { assetBearing, componentPlan, installComponent } from "../component_assets.mjs";
import { texturePng, textureKind } from "../texture_gen.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const NINE = ["caption-texture", "caret-swap", "hw-arrow", "hw-boil", "hw-box-label", "hw-callout-circle", "hw-underline", "marker-checklist-card", "texture-mask-text"];
assert.deepEqual(assetBearing(), NINE);
const REFUSED = { "caret-swap": /Geist/, "marker-checklist-card": /Permanent Marker/ };

// textures: valid greyscale PNGs, deterministic, different per name, with real contrast
const png = (n) => texturePng(n, 128);
assert.ok(png("lava").equals(png("lava")) && !png("lava").equals(png("rock")) && !png("wood-066").equals(png("wood-094")));
for (const n of ["lava", "wood-066", "marble-012", "bricks-104", "metal-046-b", "concrete-042-a", "rock-058", "grass-001", "snow-015", "tiles-138", "fabric-083", "bark-014", "onyx"]) {
  const b = png(n);
  assert.deepEqual([...b.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${n}: png signature`);
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20), b[24], b[25]], [128, 128, 8, 0], `${n}: 128x128 8-bit grey`);
  assert.ok(b.length > 2000, `${n}: not a flat image (${b.length} bytes)`);
}
assert.deepEqual(["lava", "wood-066", "bricks-104", "metal-046-b", "marble-012", "onyx", "carpet"].map(textureKind), ["lava", "wood", "brick", "metal", "marble", "marble", "fabric"]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p12b-comp-"));
const browser = await launch(["--allow-file-access-from-files", "--force-device-scale-factor=1"]);
try {
  const gsap = pathToFileURL(path.join(ROOT, "vendor/gsap/dist/gsap.min.js")).href;
  for (const name of NINE) {
    const proj = path.join(tmp, name);
    fs.mkdirSync(proj);
    const r = installComponent(name, proj);
    if (REFUSED[name]) {
      assert.equal(r.ok, false); assert.match(r.missing.map((m) => m.why).join(" "), REFUSED[name]);
      assert.ok(!fs.existsSync(path.join(proj, "hf")), `${name}: nothing written when an asset is missing`);
      console.log(`${name}: refused, ${r.missing.map((m) => m.file).join(", ")}`);
      continue;
    }
    assert.ok(r.ok, `${name}: ${JSON.stringify(r.missing)}`);
    for (const a of r.assets) assert.ok(fs.statSync(path.join(proj, a)).size > 0, `${a} written`);
    const html = fs.readFileSync(r.dest, "utf8");
    assert.ok(html.startsWith(`<!-- ${name} from the HyperFrames catalog`), "header");
    assert.ok(!/url\(["']\/assets\//.test(html), "no root-absolute asset URL left");
    if (name.startsWith("hw-")) {
      assert.ok(fs.readFileSync(path.join(proj, "hf/assets/fonts/Caveat-700-latin.woff2")).equals(fs.readFileSync(path.join(ROOT, "fonts/caveat/700.woff2"))), "Caveat copied from fonts/");
      assert.ok(fs.existsSync(path.join(proj, "hf/assets/fonts/Caveat-OFL.txt")), "licence text beside the font");
    }
    if (name === "caption-texture") assert.deepEqual(fs.readdirSync(path.join(proj, "hf/compositions/components")).sort(),
      ["concrete-042-a.png", "lava.png", "marble-012.png", "metal-046-b.png", "rock-058.png", "wood-066.png"]);
    if (name === "texture-mask-text") assert.equal(fs.readdirSync(path.join(proj, "hf/assets/texture-mask-text/masks")).length, 9, "9 base masks by default");

    // load it in a browser the way KIT.block does
    const page = path.join(proj, "hf/index.html");
    fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><script src="${gsap}"></script><body style="margin:0;background:#111"><div id="stage" style="position:relative;width:1920px;height:1080px"></div></body>`);
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs = [], failed = [];
    p.on("pageerror", (e) => errs.push(e.message)); p.on("requestfailed", (q) => failed.push(q.url()));
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await p.goto(pathToFileURL(page).href);
    await p.evaluate((h) => {
      const box = document.createElement("div"); box.className = "kit-block"; document.getElementById("stage").append(box); box.innerHTML = h;
      for (const old of box.querySelectorAll("script")) { if (old.src) continue; const s = document.createElement("script"); s.textContent = old.textContent; old.replaceWith(s); }   // KIT.block skips CDN src
    }, html.replace(/<script[^>]*\ssrc=[^>]*><\/script>/g, ""));
    await p.waitForTimeout(400);
    if (name.startsWith("hw-")) {
      const info = await p.evaluate(async () => {
        const faces = [...document.fonts].map((f) => f.family.replace(/["']/g, ""));
        await Promise.all([...document.fonts].map((f) => f.load()));
        const tl = (window.__timelines || {})[Object.keys(window.__timelines || {})[0]];
        tl && tl.seek && tl.seek(1.2);
        return { faces, status: [...document.fonts].map((f) => f.status), tl: Object.keys(window.__timelines || {}), dur: tl && tl.duration && tl.duration() };
      });
      assert.deepEqual(info.tl, [name], `${name}: registers its timeline`);
      assert.ok(info.faces.some((f) => /caveat/i.test(f)) && info.status.every((s) => s === "loaded"), `${name}: font faces ${JSON.stringify(info)}`);
    } else if (name === "caption-texture") {
      const size = await p.evaluate(async () => { const i = new Image(); i.src = "compositions/components/lava.png"; await i.decode(); return [i.naturalWidth, i.naturalHeight]; });
      assert.deepEqual(size, [512, 512]);
      assert.ok(await p.evaluate(() => Object.keys(window.__timelines || {}).includes("caption-texture")), "registers its timeline");
    } else if (name === "texture-mask-text") {
      const got = await p.evaluate(async () => {
        const d = document.createElement("div"); d.className = "hf-texture-text hf-texture-lava"; d.textContent = "LAVA"; document.body.append(d);
        const url = getComputedStyle(d).maskImage.match(/url\("?([^")]+)"?\)/)[1];
        const i = new Image(); i.src = url; await i.decode(); return { url, w: i.naturalWidth };
      });
      assert.ok(got.url.endsWith("assets/texture-mask-text/masks/lava.png") && got.w === 512, JSON.stringify(got));
    }
    assert.deepEqual(errs.filter((e) => !/cdn\.jsdelivr|ERR_INTERNET|Failed to load resource/.test(e)), [], `${name}: page errors`);
    assert.deepEqual(failed.filter((u) => !/cdn\.jsdelivr/.test(u)), [], `${name}: failed requests`);
    await p.close();
    console.log(`${name}: installed ${r.assets.length} asset(s), loads clean`);
  }
  // --all-textures and a chosen set
  const all = installComponent("texture-mask-text", path.join(tmp, "all"), { allTextures: true });
  assert.equal(all.assets.length, 66);
  assert.equal(installComponent("caption-texture", path.join(tmp, "some"), { textures: ["lava"] }).assets.length, 1);
  assert.throws(() => componentPlan("../x"), /no component/);
  // --font-dir: the user supplies the two missing families' files (stub bytes here) and the component installs
  const fd = path.join(tmp, "fonts-in"); fs.mkdirSync(fd);
  for (const f of ["Geist-Latin.woff2", "Geist-OFL.txt"]) fs.writeFileSync(path.join(fd, f), "stub " + f);
  const cs = installComponent("caret-swap", path.join(tmp, "cs"), { fontDir: fd });
  assert.ok(cs.ok && fs.readFileSync(path.join(tmp, "cs/hf/compositions/components/caret-swap/Geist-Latin.woff2"), "utf8") === "stub Geist-Latin.woff2");
  assert.equal(installComponent("marker-checklist-card", path.join(tmp, "mc"), { fontDir: fd }).ok, false, "still refused when only some of its files are supplied");
} finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("p12b-components ok: 9 asset-bearing components found, 7 install with assets and load clean, 2 refused with reasons");
