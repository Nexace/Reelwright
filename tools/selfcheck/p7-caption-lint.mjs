// node tools/selfcheck/p7-caption-lint.mjs — HyperFrames F2: the caption-lint WARN check (tools/checks/caption-lint.page.mjs)
// stays quiet on a well-made caption (the engine's own .kit-subs markup and CSS) and reports each of its six rules on a page
// made to break exactly that rule. Needs Chromium (as `reelwright qa` does); offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import check, { kind } from "../checks/caption-lint.page.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
assert.equal(kind, "warn");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p7-cap-"));
const kitCss = fs.readFileSync(path.join(ROOT, "tools/kit.css"), "utf8").split("\n").filter((l) => /kit-sub/.test(l)).join("\n");
// one VO line, 1.0–3.0 s; the caption is on from 0.85 to 3.35 s like K.subtitles shows it, hard-hidden otherwise (unless `stuck`)
const WORDS = [{ w: "hello", t: 1, d: 0.5 }, { w: "there", t: 1.6, d: 0.5 }];
const html = ({ css = "", markup = '<div class="kit-subs"><div class="kit-subrow"><span>hello </span><span>there </span></div></div>', words = WORDS, stuck = false, after = "" }) => `<!doctype html>
<meta charset="utf-8"><style>
body{margin:0;width:1280px;height:720px;background:#223;font:40px sans-serif;color:#fff;position:relative}
:root{--kit-sub-bg:rgba(0,0,0,.7);--kit-sub-ink:#fff;--kit-sub-said:#fff;--kit-sub-now:#ff0;--kit-sub-radius:12px;--kit-sub-font:600 40px sans-serif;--kit-safe-w:1100px}
${kitCss}
${css}</style>${markup}<script>
window.VO = { a: { start: 1, end: 3, text: "hello there", words: ${JSON.stringify(words)} } };
window.FILM = { DUR: 6 };
window.KIT = { safe: { x: 90, w: 1100 } };
window.render = async (t) => {
  const on = t >= 0.85 && t <= 3.35 ? 1 : 0;
  for (const e of document.querySelectorAll('.kit-subrow, .caption-group, .cg-1')) { e.style.opacity = ${stuck ? "(t > 3.35 ? 1 : on)" : "on"}; e.style.visibility = ${stuck ? "1" : "on"} ? 'visible' : 'hidden'; }
  ${after}
};
</script>`;
const run = async (browser, name, spec) => {
  const f = path.join(tmp, name + ".html"); fs.writeFileSync(f, html(spec));
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try { await p.goto(pathToFileURL(f).href); return await check(p, { P: {}, W: 1280, H: 720 }); } finally { await p.close(); }
};
const CAP = '<div class="caption-group" style="position:absolute;left:100px;bottom:80px;font-size:40px">';   // a component-style caption
const browser = await launch(["--force-device-scale-factor=1"]);
try {
  assert.deepEqual(await run(browser, "good", {}), [], "the engine's own subtitle markup raises nothing");
  assert.deepEqual(await run(browser, "good2", { markup: CAP + "<span>hello</span> <span>there</span></div>" }), [], "a plain absolute caption group raises nothing");
  const want = [
    ["overflow", { markup: '<div class="caption-group" style="position:absolute;left:900px;bottom:80px;white-space:nowrap;font-size:60px">hello there everyone</div>' }, /caption_text_overflow .*runs past the 1280 px frame/],
    ["overflow-nowrap", { markup: '<div class="caption-group" style="position:absolute;left:20px;bottom:80px;white-space:nowrap;font-size:40px;width:1200px">hello</div>' }, /caption_text_overflow .*nowrap with no max-width/],
    ["overflow-clip", { markup: '<div class="caption-group" style="position:absolute;left:100px;bottom:80px;width:100px;overflow:hidden;white-space:nowrap">hello there everyone</div>' }, /caption_text_overflow .*clipped by overflow: hidden/],
    ["relative", { markup: '<div class="caption-group" style="position:relative;font-size:40px">hello there</div>' }, /caption_container_relative_position .*caption-group/],
    ["fitscale", { markup: CAP.replace("left:100px", "left:60px").replace(">", ' data-x>') + '<span class="caption-word" style="display:inline-block;transform:scale(1.8);transform-origin:left">hello</span></div>' }, /caption_fittext_scale .*scaled 1\.80×/],
    ["shadow", { markup: CAP.replace("font-size:40px", "font-size:40px;text-shadow:0 0 20px #0ff") + '<span style="color:rgba(255,255,255,.4)">hello there</span></div>' }, /caption_textshadow_on_group .*\.caption-group/],
    ["stuck", { stuck: true }, /caption_exit_missing_hard_kill [\d.]+s \.kit-subrow: still visible/],
    ["nowords", { words: [] }, /caption_words_missing .*line "a"/],
  ];
  for (const [name, spec, re] of want) {
    const out = await run(browser, name, spec);
    assert.ok(out.some((l) => re.test(l)), `${name}: wanted ${re}, got ${JSON.stringify(out)}`);
    assert.ok(out.length <= 12 && out.every((l) => !l.includes("\n")), "short lines, capped");
  }
  // the switch
  const f = path.join(tmp, "off.html"); fs.writeFileSync(f, html({ stuck: true }));
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(pathToFileURL(f).href);
  assert.deepEqual(await check(p, { P: { qa: { "caption-lint": false } } }), [], '"qa": {"caption-lint": false} silences it');
  // a page with no captions at all is skipped
  const g = path.join(tmp, "none.html"); fs.writeFileSync(g, html({ markup: "<h1>hi</h1>" }));
  await p.goto(pathToFileURL(g).href); assert.deepEqual(await check(p, { P: {} }), []);
} finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("p7-caption-lint self-check: quiet on good captions, 6 rules (8 variants) reported on broken ones");
