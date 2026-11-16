// determinismGate(file, { W, H, n = 16 }) → { ok, times, bad: [{ t, pair }], distinct }: the film page's frames must be a function of t alone.
// The same n times (the first, the last, the rest spread over the film) are screenshotted four ways and the hashes compared:
//   forward    one fresh browser, times ascending                    (cold cache, the order a renderer uses)
//   reverse    a second fresh browser, times descending              (nothing the forward pass did can have leaked)
//   cached     the forward browser again, a shuffled order           (cached: every frame is a revisit, fonts/images warm)
//   cold       a third fresh browser, one time per page load         (no state at all: what a parallel render page sees)
// A film whose render(t) reads a clock, Math.random, or what the previous frame left behind fails here. `distinct` is how many different
// frames the forward pass gave (a film that never changes would pass trivially: ok also needs distinct >= 2).
// Pairs: forward≠reverse, forward≠cached, forward≠cold. Pure Chromium screenshots, no renderer needed; the film must be pvk (window.render).
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { launch } from "./browser.mjs";

const sha = (b) => crypto.createHash("sha1").update(b).digest("hex").slice(0, 16);
const ARGS = ["--force-device-scale-factor=1", "--allow-file-access-from-files"];

async function pass(file, W, H, order, perPage = false) {
  const browser = await launch(ARGS), out = {};
  try {
    const open = async () => {
      const p = await browser.newPage({ viewport: { width: W, height: H } });
      await p.goto(pathToFileURL(path.resolve(file)).href);
      if (!(await p.evaluate(() => window.READY).catch(() => false))) throw new Error(`${file}: READY never resolved`);
      return p;
    };
    let p = perPage ? null : await open();
    for (const t of order) {
      if (perPage) p = await open();
      await p.evaluate((t) => window.render(t), t);
      out[t] = sha(await p.screenshot({ type: "png" }));
      if (perPage) await p.close();
    }
  } finally { await browser.close(); }
  return out;
}

export async function determinismGate(file, { W = 1920, H = 1080, n = 16, dur } = {}) {
  if (dur == null) {
    const b = await launch(ARGS);
    try { const p = await b.newPage({ viewport: { width: W, height: H } }); await p.goto(pathToFileURL(path.resolve(file)).href);
      await p.evaluate(() => window.READY); dur = await p.evaluate(() => window.FILM.DUR); } finally { await b.close(); }
  }
  const times = Array.from({ length: n }, (_, i) => +(dur * i / (n - 1)).toFixed(3));
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const shuffled = times.slice().sort(() => rnd() - 0.5);
  const fwd = await pass(file, W, H, times), rev = await pass(file, W, H, times.slice().reverse());
  // cached: forward pass then revisit in one browser (a second visit of every time, shuffled)
  const cached = await (async () => {
    const browser = await launch(ARGS), out = {};
    try {
      const p = await browser.newPage({ viewport: { width: W, height: H } });
      await p.goto(pathToFileURL(path.resolve(file)).href); await p.evaluate(() => window.READY);
      for (const t of times) await p.evaluate((t) => window.render(t), t);
      for (const t of shuffled) { await p.evaluate((t) => window.render(t), t); out[t] = sha(await p.screenshot({ type: "png" })); }
    } finally { await browser.close(); }
    return out;
  })();
  const cold = await pass(file, W, H, shuffled, true);
  const bad = [];
  for (const t of times) for (const [pair, other] of [["forward≠reverse", rev], ["forward≠cached", cached], ["forward≠cold", cold]]) if (fwd[t] !== other[t]) bad.push({ t, pair });
  const distinct = new Set(Object.values(fwd)).size;
  return { ok: !bad.length && distinct >= 2, times, bad, distinct, dur };
}
