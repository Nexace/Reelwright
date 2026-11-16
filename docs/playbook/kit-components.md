# Kit components (Phase 11, package P6, row 2b.6)

`tools/kit-components.js` adds `KIT.components` (load after `engine.js`; `flashCut` also needs `transitions.js`): five small pieces
rewritten from the video-shotcraft card names. Each builds its DOM once and writes styles in `set(t)`, a pure function of t
(proof: `node tools/selfcheck/p6-components.mjs`, both renderers, shuffled seeks). Position the returned `el` like any stage child.

| component | call | what it does |
|---|---|---|
| caption info-strip | `infoStrip(parent, { items: [{ k, v }], at, dur, bottom })` | a dark bar of key/value chips above the captions ("Users 12k, Uptime 99.9%"); the chips rise in staggered (under 0.4 s total) |
| digit roll | `digitRoll(parent, { to, from, at, dur, digits, prefix, suffix, size })` | an odometer: one column per digit, the ones column rolls continuously, each higher column only turns while the one below goes 9 to 0, no leading zeros; exact at the end. `value(t)` is the number shown. Use it instead of `KIT.count` when the number should roll rather than fade |
| flash cut | `flashCut({ from, to, at, dur = 0.2, color, cue })` | the cut hidden in a flash: `KIT.transition('flash')` with a short default window (returns the transition) |
| vertical ticker | `verticalTicker(parent, { items, at, step, tick, rows, loop, rowH })` | rows scroll up one per `step`, moving over the last `tick` seconds of each; the middle row is in focus, the others dim. `pos(t)` is the scroll position in rows |
| clip card | `clipCard(parent, { clip, src, w, h, title, sub, at, dur, x, y })` | a recorded clip as the hero of a card: pass the `KIT.clip(...)` result (the card shows `clip.frameAt(clip.clipAt(t))`) or `src(t)` returning an image URL; the card rises in with the theme's ease |

Also there already: `KIT.subtitles` (captions), `KIT.count` (count-up), blocks `number-wheel`, `slot-machine-roll`, `news-ticker`,
`ticker-takeover` (`reelwright add`).
