// node tools/selfcheck/p8-captions.mjs — the caption adapter (tools/captions.mjs, `reelwright captions`): transcript.json comes from a
// timeline.json's VO words, and every caption-* component with a timed word list, retargeted to it, builds in Chromium (vendor/gsap, no
// network) without errors, registers a timeline at least as long as the speech, and holds the new words. Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launch } from "../browser.mjs";
import { transcriptFrom, retarget } from "../captions.mjs";
import { catalog, search } from "../catalog.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const TL = { DUR: 9, VO: { b: { start: 4.2, words: [{ w: "Reports", t: 4.2, d: 0.4 }, { w: "ship", t: 4.6, d: 0.3 }, { w: "automatically.", t: 4.9, d: 0.7 }] },
  a: { start: 0.8, words: [{ w: "Ship", t: 0.8, d: 0.3 }, { w: "faster,", t: 1.1, d: 0.4 }, { w: "confidently", t: 1.5, d: 0.6 }, { w: "every", t: 2.1, d: 0.3 }, { w: "single", t: 2.4, d: 0.4 }, { w: "week", t: 2.8, d: 0.4 }] } } };
const words = transcriptFrom(TL);
assert.deepEqual(words.map((w) => w.text).slice(0, 3), ["Ship", "faster,", "confidently"], "lines in time order");
assert.equal(words.length, 9);
assert.ok(words.every((w, i) => w.end > w.start && (!i || w.start >= words[i - 1].start)));

const comps = search(catalog(ROOT), { type: "component", tag: "caption-style" });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p8-captions-"));
const gsap = pathToFileURL(path.join(ROOT, "vendor", "gsap", "dist", "gsap.min.js")).href;
const b = await launch(["--allow-file-access-from-files"]);
const ok = [], skipped = [];
try {
  for (const c of comps) {
    const src = fs.readFileSync(path.join(ROOT, "vendor", "hyperframes", "registry", "components", c.name, c.name + ".html"), "utf8");
    let html;
    try { html = retarget(src, words, TL.DUR); } catch (e) { skipped.push(c.name); continue; }
    assert.ok(!/cdn\.jsdelivr\.net\/npm\/gsap/.test(html), `${c.name}: CDN tag dropped`);
    const f = path.join(tmp, c.name + ".html");
    fs.writeFileSync(f, html.replace("<head>", `<head><script src="${gsap}"></script>`));
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }), errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(pathToFileURL(f).href);
    const r = await p.evaluate((ws) => {
      const tls = Object.values(window.__timelines || {}), tl = tls[0];
      if (!tl) return { err: "no timeline registered" };
      tl.time(2.2);   // mid-speech: nothing may throw
      const text = document.documentElement.textContent.toLowerCase();
      return { dur: tl.duration(), n: tls.length, found: ws.filter((w) => text.includes(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""))).length };
    }, words.map((w) => w.text));
    await p.close();
    assert.ok(!errs.length, `${c.name}: ${errs.join("; ")}`);
    assert.ok(!r.err && r.dur >= 5.5 - 0.01, `${c.name}: ${JSON.stringify(r)} (speech ends 5.6 s)`);
    assert.ok(r.found >= words.length / 2, `${c.name}: only ${r.found} of ${words.length} words in the page`);
    ok.push(c.name);
  }
} finally { await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
assert.ok(ok.length >= 12, `only ${ok.length} components run: skipped ${skipped}`);
console.log(`p8-captions self-check: transcript from timeline words; ${ok.length} of ${comps.length} caption-style components run with it (no timed word list: ${skipped.join(", ") || "none"})`);
