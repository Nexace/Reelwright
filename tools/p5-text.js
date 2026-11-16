// p5-text.js: how long text must stay up, and how a spoken line is cut into on-screen phrases. Load after engine.js. Pure.
//   KIT.wordCount(text)        number of words (split on whitespace; symbols alone do not count)
//   KIT.readS(text)            seconds a viewer needs to read it: max(0.7, 0.3 per word)
//   KIT.chatHold(text)         a chat bubble: read time plus 0.4 s for the reply beat (so a "typing" gap is never shorter than the read)
//   KIT.paced(texts, { t0 = 0, gap = 0.2, to })   → [{ text, in, out, readS }] one after another from t0, each up for its readS (and `gap`
//                              between them). With `to`, the spare time is shared out by word count so the last one ends at `to`; if the
//                              texts cannot be read in the window it throws and says how many seconds are missing (cut words, not time).
//   KIT.phrases(id, { min = 2, max = 6 })   VO line `id` cut into 2–6 word phrases → [{ id, i0, i1, text, words, t, end }]: breaks go at
//                              punctuation first (sentence ends, then commas), else near the middle; t = the spoken start of the phrase's FIRST
//                              word (KIT.align), end = the next phrase's t or the line's end. A one-word line stays one phrase.
//   KIT.captionPhrases(o)      the same for every VO line, in the cue shape of KIT.captionCues ({ id, t, end, text }) for .srt/.vtt
//   KIT.subtitlePhrases(ids, { parent, o })  → { box, set(t) } shows one phrase at a time, landing on its first spoken word
// The same numbers are the QA WARNs `readtime` and `caption-tight` (tools/checks/p5-readtime.page.mjs).
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('p5-text.js: load tools/engine.js first');
  const wordsOf = (s) => String(s).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  K.wordCount = (s) => wordsOf(s).length;   // (K.words is the engine's spoken-words builder)
  K.readS = (s) => Math.max(0.7, 0.3 * wordsOf(s).length);
  K.chatHold = (s) => K.readS(s) + 0.4;
  K.paced = (texts, { t0 = 0, gap = 0.2, to } = {}) => {
    const need = texts.map((x) => K.readS(typeof x === 'string' ? x : x.text)), total = need.reduce((a, b) => a + b, 0) + gap * Math.max(0, texts.length - 1);
    let spare = 0;
    if (to != null) {
      spare = to - t0 - total;
      if (spare < -1e-9) throw new Error(`paced: ${texts.length} text(s) need ${total.toFixed(2)} s at 0.3 s/word, the window has ${(to - t0).toFixed(2)} s: cut ${(-spare / 0.3).toFixed(0)} word(s)`);
    }
    const w = texts.map((x) => wordsOf(typeof x === 'string' ? x : x.text).length || 1), W = w.reduce((a, b) => a + b, 0);
    let t = t0;
    return texts.map((x, i) => {
      const text = typeof x === 'string' ? x : x.text, d = need[i] + (spare * w[i]) / W, r = { text, in: t, out: t + d, readS: need[i] };
      t += d + gap; return r;
    });
  };

  // ── phrases ──────────────────────────────────────────────────────────────
  const strong = /[.!?…]["')\]]*$/, weak = /[,;:—–-]["')\]]*$/;
  const cut = (toks, i0, i1, min, max, out) => {   // toks[i0..i1) into pieces of min..max words
    const n = i1 - i0;
    if (n <= max) return out.push([i0, i1]);
    let best = -1, bs = -Infinity;
    for (let b = i0 + min; b <= i1 - min; b++) {
      const left = b - i0, right = i1 - b, s = (strong.test(toks[b - 1]) ? 6 : weak.test(toks[b - 1]) ? 3 : 0) - Math.abs(left - right) * 0.5;
      if (s > bs) { bs = s; best = b; }
    }
    if (best < 0) best = i0 + Math.ceil(n / 2);
    cut(toks, i0, best, min, max, out); cut(toks, best, i1, min, max, out);
  };
  const split = (text, min, max) => {
    const toks = String(text).split(/\s+/).filter(Boolean), out = [];
    if (!toks.length) return { toks, out };
    let a = 0;
    for (let i = 0; i < toks.length; i++) if (strong.test(toks[i]) || i === toks.length - 1) { cut(toks, a, i + 1, min, max, out); a = i + 1; }
    for (let i = 0; i < out.length - 1; ) {   // a piece under `min` words joins a neighbour when the sum still fits
      const [a0, a1] = out[i], [b0, b1] = out[i + 1];
      if ((a1 - a0 < min || b1 - b0 < min) && b1 - a0 <= max) { out.splice(i, 2, [a0, b1]); i = Math.max(0, i - 1); } else i++;
    }
    return { toks, out };
  };
  K.phrases = (id, { min = 2, max = 6 } = {}) => {
    if (!(min >= 1 && max >= min)) throw new Error('phrases: need 1 <= min <= max');
    const v = K.V(id), ts = K.align(id), { toks, out } = split(v.text, min, max);
    return out.map(([i0, i1], k) => ({ id, i0, i1, words: i1 - i0, text: toks.slice(i0, i1).join(' '), t: ts[i0], end: k + 1 < out.length ? ts[out[k + 1][0]] : v.end }));
  };
  K.captionPhrases = (o) => Object.keys(K.VO).flatMap((id) => K.phrases(id, o).map((p) => ({ id, t: p.t, end: +p.end.toFixed(3), text: p.text }))).sort((a, b) => a.t - b.t);
  K.subtitlePhrases = (ids, { parent = K.stage, ...o } = {}) => {
    const box = K.el('div', 'kit-subs', parent), items = ids.flatMap((id) => K.phrases(id, o)).map((p) => ({ p, row: K.el('div', 'kit-subrow', box) }));
    items.forEach(({ p, row }) => { row.textContent = p.text; });
    return { box, items: items.map((x) => x.p), set(t) {
      for (const { p, row } of items) K.show(row, K.win(t, p.t - 0.04, p.end, 0.06, 0.06) > 0 && t >= p.t - 0.04 && t < p.end ? K.win(t, p.t - 0.04, p.end, 0.06, 0.06) : 0);
    } };
  };
})();
