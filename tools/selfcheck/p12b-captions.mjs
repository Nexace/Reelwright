// node tools/selfcheck/p12b-captions.mjs — E8: the 16 transcript-driven caption-* components run on a film's own words.
// A timeline.json-shaped fixture (4 VO lines, 37 words, 19 s: not the components' 28-word demo) goes through
// transcriptFromTimeline → adaptCaption; each adapted component is loaded in Chromium as KIT.block loads it and must register its
// timeline, last at least as long as the words, throw nothing, show none of the demo script, and show the word being spoken
// (case-insensitive) at most of 12 sampled moments. caption-blend-difference (a CSS blend recipe, no script) is excluded by design.
// No network.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { adaptCaption, captionComponents, groupWords, transcriptFromTimeline, writeTranscript } from "../caption_transcript.mjs";
import { installComponent } from "../component_assets.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const LINES = [["Ship product films straight from plain code.", 0.4], ["Every scene is a function of time, so renders never drift.", 5.2], ["Change one line of script and the whole edit follows.", 10.1], ["Nothing here needs a network or a model.", 14.6]];
const VO = {};
LINES.forEach(([text, at], k) => {
  let t = at; const words = text.split(" ").map((w) => { const d = 0.18 + 0.03 * (w.length % 5), o = { w, t: +t.toFixed(3), d: +d.toFixed(3) }; t += d + 0.04; return o; });
  VO["l" + k] = { start: at, end: +t.toFixed(3), text, words };
});
const T = { DUR: 19, VO };
const words = transcriptFromTimeline(T);
assert.ok(words.length > 28 && words.length !== 28, "more words than the components' 28-word demo");
assert.deepEqual(Object.keys(words[0]), ["text", "start", "end"]);
assert.ok(words.every((w, i) => w.end > w.start && (!i || w.start >= words[i - 1].start)));
const g = groupWords(words);
assert.ok(g[0][0] === 0 && g.at(-1)[1] === words.length - 1 && g.every(([a, b], i) => b >= a && (!i || a === g[i - 1][1] + 1) && b - a <= 3), "groups are contiguous, ≤ 4 words");
assert.ok(g.some(([, b]) => /[.!?]$/.test(words[b].text)), "a group ends at a sentence end");

const NAMES = captionComponents();
assert.equal(NAMES.length, 16);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p12b-cap-"));
// writeTranscript: from a project's timeline.json
fs.mkdirSync(path.join(tmp, "proj")); fs.writeFileSync(path.join(tmp, "proj/timeline.json"), JSON.stringify(T));
assert.equal(writeTranscript(path.join(tmp, "proj")).length, words.length);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp, "proj/transcript.json"), "utf8"))[0], words[0]);
fs.writeFileSync(path.join(tmp, "proj/timeline.json"), JSON.stringify({ DUR: 3, VO: {} }));
assert.throws(() => writeTranscript(path.join(tmp, "proj")), /no VO words/);

const DEMO = ["HyperFrames", "cinema.", "timeline.", "professional"];
const browser = await launch(["--allow-file-access-from-files", "--force-device-scale-factor=1"]);
const gsap = pathToFileURL(path.join(ROOT, "vendor/gsap/dist/gsap.min.js")).href;
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, "");
try {
  for (const name of NAMES) {
    const proj = path.join(tmp, name); fs.mkdirSync(proj);
    const inst = name === "caption-texture" ? installComponent(name, proj) : null;   // its textures come with it
    const src = inst ? fs.readFileSync(inst.dest, "utf8") : fs.readFileSync(path.join(ROOT, "vendor/hyperframes/registry/components", name, name + ".html"), "utf8");
    const html = adaptCaption(src, words); assert.ok(!/<template/.test(html.replace(/<!--[\s\S]*?-->/g, "")), `${name}: no template wrapper`);
    for (const d of DEMO) assert.ok(!new RegExp(`text: "${d.replace(".", "\\.")}"`).test(html) , `${name}: demo word ${d} left in the script`);
    assert.ok(+html.match(/data-duration="([\d.]+)"/)[1] >= words.at(-1).end, `${name}: duration follows the words`);
    fs.mkdirSync(path.join(proj, "hf"), { recursive: true });
    const page = path.join(proj, "hf/index.html");
    fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><script src="${gsap}"></script><body style="margin:0;background:#222"><div id="stage" style="position:relative;width:1920px;height:1080px;overflow:hidden"></div></body>`);
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|cdn\./.test(m.text())) errs.push(m.text()); });
    await p.goto(pathToFileURL(page).href);
    await p.evaluate((h) => {
      const box = document.createElement("div"); box.className = "kit-block"; document.getElementById("stage").append(box); box.innerHTML = h;
      for (const old of box.querySelectorAll("script")) { if (old.src) continue; const s = document.createElement("script"); s.textContent = old.textContent; old.replaceWith(s); }
    }, html.replace(/<script[^>]*\ssrc=[^>]*><\/script>/g, ""));
    await p.waitForTimeout(300);
    const dur = await p.evaluate(() => { const k = Object.keys(window.__timelines || {}); return k.length === 1 ? window.__timelines[k[0]].duration() : k; });
    assert.equal(typeof dur, "number", `${name}: registers exactly one timeline, got ${JSON.stringify(dur)}; page errors: ${errs.join(" | ")}`);
    assert.ok(dur >= words.at(-1).start, `${name}: timeline ${dur}s ends before the last word starts (${words.at(-1).start}s)`);
    let hit = 0, n = 0;
    for (const w of words.filter((_, i) => i % 3 === 1).slice(0, 12)) {
      const at = (t) => p.evaluate((t) => { const k = Object.keys(window.__timelines)[0]; window.__timelines[k].seek(t); return document.getElementById("stage").innerText; }, t);
      const texts = [await at((w.start + w.end) / 2), await at(w.end - 0.02), await at(w.start + 0.22)];   // matrix-decode shows scramble for 0.2 s before the word
      n++; if (texts.some((x) => norm(x).includes(norm(w.text)))) hit++;
      for (const x of texts) for (const d of DEMO) assert.ok(!norm(x).includes(norm(d)), `${name}: demo word ${d} on screen near ${w.start}`);
    }
    assert.deepEqual(errs, [], `${name}: page errors`);
    assert.ok(hit / n >= 0.75, `${name}: the spoken word was on screen at ${hit}/${n} sampled moments`);
    console.log(`${name}: ${dur.toFixed(1)}s timeline, spoken word on screen ${hit}/${n}`);
    await p.close();
  }
} finally { await browser.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("p12b-captions ok: timeline.json words → transcript.json → 16 caption components run on them");
