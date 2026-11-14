// The motion deck: 46 named moves in 8 groups (open, seam, cam, reveal, type, act, emph, close), each mapped to the KIT call that makes it
// and the numbers that make it that move. Reelwright's own deck, written from what the kit ships (names and tuned numbers are the kit's, from
// tools/shots.js, shots2.js, transitions.js, layouts.js, doodle*.js, motion.js and the p5-*.js modules); nothing here is a port of anyone's file.
// `kit` is a path under window.KIT that tools/selfcheck/p5-deck.mjs resolves in a real page, so a rename that breaks the deck fails CI;
// `type` is a KIT.transition type name (also checked against KIT.transition.names).
//   DECK                       [{ n, cat, name, kit, type?, call, numbers, load }]    load = the script(s) the call needs after engine.js
//   find(query)                moves whose name, group, call or numbers contain every word of the query
//   deal({ seed, cats })       one move per group, picked by a seeded hash (the same seed always deals the same hand): a hand to start an edit from
// CLI: `reelwright deck` (list), `reelwright deck find <words>`, `reelwright deck deal [--seed N]` (tools/commands/deck.mjs).
const A = "tools/shots.js", B = "tools/shots2.js", C = "tools/p5-camera.js", L = "tools/layouts.js", T = "tools/transitions.js", D2 = "tools/doodle2.js", M = "tools/motion.js";
const R = (cat, name, kit, call, numbers, load, type) => ({ cat, name, kit, call, numbers, load, ...(type ? { type } : {}) });

export const DECK = [
  // open
  R("open", "words-land", "layout.kinetic", "KIT.layout.kinetic({ line, accent: [..], in })", "each word lands on its spoken start - 0.06 s, 0.35 s ease, rises 0.25 em from 90 %", L),
  R("open", "big-number", "layout.stat", "KIT.layout.stat({ value, label, in, at })", "KIT.count outExpo count-up from `at` (put it on the spoken number)", L),
  R("open", "one-line-fill", "layout.fullBleed", "KIT.layout.fullBleed({ text, accent, in })", "one display line as large as the safe box fits, words rise in turn", L),
  R("open", "pen-wordmark", "doodle.letters", "D.letters(svg, 'NAME', { size, in })", "nib at 700 px/s, shade width 0.09 em, hair 0.25 of it", D2),
  R("open", "crane-rise", "shot.craneRise", "KIT.shot.craneRise({ t0, dur })", "starts 0.3 H low, z 1.6, tilt 6 deg, rises to level, power2.out over 100 f", A),
  R("open", "one-world", "world", "KIT.world({ regions }).tour([{ at, region }])", "every beat a box on one canvas; the camera fits each (0.9), log2 zoom", "tools/p5-time.js, " + C),
  // seam
  R("seam", "brush-wipe", "transition", "KIT.transition('brush', { from, to, at, dur })", "6 seeded bristle strokes, 0.6 s", T, "brush"),
  R("seam", "iris", "transition", "KIT.transition('iris', { from, to, at, x, y })", "circle opens from (x, y), 0.6 s", T, "iris"),
  R("seam", "flash-cut", "transition", "KIT.transition('flash', { from, to, at, color })", "colour flash hides the cut, 0.6 s", T, "flash"),
  R("seam", "wipe", "transition", "KIT.transition('wipe', { from, to, at, dir })", "clip-path inset edge, 0.6 s", T, "wipe"),
  R("seam", "push", "transition", "KIT.transition('push', { from, to, at, dir })", "both layers travel one frame, 0.6 s", T, "push"),
  R("seam", "matched-move", "doodle.matchedMove", "D.matchedMove({ dir, exitDist, exitDur })", "exit dist*u^3, entry -dist*(1-u)^3: both leave the cut at 3*dist/dur px/s", D2),
  R("seam", "shape-handoff", "morph.handoff", "KIT.morph.handoff({ from, to, t0, t1 })", "one outline travels, stretches up to 1.35x along its path, lands exactly on the target", "tools/p5-morph.js"),
  R("seam", "colour-flood", "morph.coverShape", "KIT.morph.coverShape({ from, t0, t1, shape })", "a rect or circle grows from a box to cover the frame exactly", "tools/p5-morph.js"),
  // cam
  R("cam", "push-in", "shot.pushIn", "KIT.shot.pushIn({ t0, dur })", "1.00 to 1.14, power2.in, 120 f", A),
  R("cam", "pull-back", "shot.pullBack", "KIT.shot.pullBack({ t0, dur })", "1.14 to 1.00, power2.out, 110 f", A),
  R("cam", "crash-zoom", "shot.crashZoom", "KIT.shot.crashZoom({ at, x, y, variant })", "1 to 2.6 in 6 f, then a 14 px shake (tau 1.8 f) or a 2.45 rebound", A),
  R("cam", "whip-pan", "shot.whipPan", "KIT.shot.whipPan({ at, dir })", "1.5 frame widths in 8 f, speed blur to 24 px; 'brake' keeps 30 % for a 48 f tail", A),
  R("cam", "dolly-zoom", "shot.dollyZoom", "KIT.shot.dollyZoom({ t0, dur }) -> { bg, hero }", "background 1 to 2.25 and blur to 3.5 px, hero untouched, 95 f (the layer fake)", A),
  R("cam", "dolly-zoom-real", "shot.dollyZoomReal", "KIT.shot.dollyZoomReal(planes, { t0, t1, dolly })", "camera dollies by q while the lens zooms (1 - q): the subject plane holds its size, far planes end at (1-q)/(1-q/d)", C),
  R("cam", "orbit", "shot.orbit", "KIT.shot.orbit({ t0, dur })", "rotateY -18 to +18 deg, perspective 1100, z 1.1, power2.out, 34 f", A),
  R("cam", "dutch-roll", "shot.dutchRoll", "KIT.shot.dutchRoll({ at })", "-10 deg to +1.2 then 0, z 1.15 to 1.08, 14 f + 10 f", A),
  R("cam", "flight", "shot.tour", "KIT.shot.tour([{ t, state, ease }])", "poses at absolute times, each flight eased per field", B),
  R("cam", "authored-keys", "shot.keys", "KIT.shot.keys([{ t, z, x, y, ease }], { log, mono })", "per-segment ease, zoom interpolated in log2, mono clamps overshoot", C),
  // reveal
  R("reveal", "tilt-reveal", "shot.tiltReveal", "KIT.shot.tiltReveal({ t0, dur })", "58 deg overhead to frontal, z 1.2, persp 900, power3.out, 50 f", B),
  R("reveal", "drone-dive", "shot.droneDive", "KIT.shot.droneDive({ t0, dur })", "z 0.45, tilt 50, bank 12, bezier(.5,0,.2,1), 70 f", B),
  R("reveal", "tabletop-drop", "shot.tabletopDrop", "KIT.shot.tabletopDrop({ t0, dur })", "z 0.6, tilt 35, roll -8, expo.out, 40 f", B),
  R("reveal", "explode", "shot.explode", "KIT.shot.explode(layers, { el, t0, t1 })", "layers separate in z while the stack turns axonometric", B),
  R("reveal", "rack-focus", "shot.rackFocus", "KIT.shot.rackFocus(near, far, { t0, t1 })", "blur hands over from the far plane to the near one", B),
  R("reveal", "depth-planes", "shot.planes", "KIT.shot.planes([{ el, z }], cam)", "one dolly, plane scale 1/(1 - dolly/z), stroke weight z^0.35", B),
  // type
  R("type", "drawn-words", "layout.kinetic", "KIT.layout.kinetic({ style: 'drawn', line, in })", "each word written by the pen on its spoken start, pops 1 to 1.08 to 1 over 0.18 s", "tools/p5-doodle.js"),
  R("type", "typewriter", "typewriter", "KIT.typewriter(el, text, { at, cps })", "18 cps, steady caret then blinking, optional mistakes and backspace", M),
  R("type", "karaoke", "subtitles", "KIT.subtitles(ids)", "spoken words highlighted as said, the current one marked", "tools/engine.js"),
  R("type", "phrases", "subtitlePhrases", "KIT.subtitlePhrases(ids, { min: 2, max: 6 })", "2 to 6 word phrases landing on the first spoken word", "tools/p5-text.js"),
  R("type", "word-by-word", "words", "KIT.words(parent, id)", "one span per spoken word, rises 22 px as it is said", "tools/engine.js"),
  R("type", "paced-text", "paced", "KIT.paced(texts, { t0, to })", "each text up for max(0.7 s, 0.3 s per word), spare time shared by word count", "tools/p5-text.js"),
  // act
  R("act", "callout", "doodle.callout", "D.callout({ anchor, cam, label, in })", "dot pops 0.22 s, leader drawn 0.35 s, label written; follows the camera", "tools/p5-doodle.js"),
  R("act", "cursor", "cursor", "KIT.cursor(parent).set(x, y, down)", "arrow that presses to 0.85 scale", "tools/engine.js"),
  R("act", "magnifier", "magnifier", "KIT.magnifier(parent, size).set(...)", "round lens, springs in with outBack", "tools/engine.js"),
  R("act", "phone-tap", "phone", "KIT.phone(opts).set(t, src, cam, taps)", "0.6 s tap ring, camera clamped to the screen", "tools/engine.js"),
  // emph
  R("emph", "indicate", "indicate.indicate", "KIT.indicate.indicate(el, { at })", "scale 1.2 there-and-back with a tint to the accent, 1 s", M),
  R("emph", "burst", "indicate.flash", "KIT.indicate.flash(el, { at })", "12 radial lines from the element", M),
  R("emph", "impact-shake", "shakeNoise", "KIT.shakeNoise(t, t0, { amp, dur })", "gradient noise, 0.04 s smoothstep attack, squared decay, +-1.2 deg about the centre", C),
  R("emph", "circle-it", "doodle.circle", "D.circle(el, { in })", "one loop of about 1.1 turns drawn on", "tools/doodle.js"),
  // close
  R("close", "quote-card", "layout.quote", "KIT.layout.quote({ text, author, in })", "card with accent quote mark and author line", L),
  R("close", "fade-through", "transition", "KIT.transition('fadeThrough', { from, to, at, color })", "dips to the theme background and back, 0.6 s", T, "fadeThrough"),
].map((m, i) => ({ n: i + 1, ...m }));

export const find = (q) => {
  const w = String(q).toLowerCase().split(/\s+/).filter(Boolean);
  return DECK.filter((m) => { const h = `${m.name} ${m.cat} ${m.call} ${m.numbers}`.toLowerCase(); return w.every((x) => h.includes(x)); });
};
// seeded: mulberry32 over an FNV-1a hash of `seed`, so `deal({ seed: 'launch' })` is the same hand on every machine
export function deal({ seed = "reelwright", cats } = {}) {
  let h = 0x811c9dc5; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  const rnd = () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const groups = [...new Set(DECK.map((m) => m.cat))].filter((c) => !cats || cats.includes(c));
  return groups.map((c) => { const pool = DECK.filter((m) => m.cat === c); return pool[Math.floor(rnd() * pool.length)]; });
}
