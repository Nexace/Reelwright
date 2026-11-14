# Lottie and dotLottie (Phase 11, package P6)

Extends [runtimes.md](runtimes.md) (`KIT.lottie`, lottie-web 5.13.0). What is verified, what is not, and `.lottie` files.
Every claim below has a fixture in `tools/selfcheck/p6-lottie.mjs`, `p6-lottie-lint.mjs` or `p6-dotlottie.mjs`: each is seeked
12 times forward on one page and the same times shuffled on a fresh one, in pvk and in HyperFrames, and the frames must match.

## What lottie-web draws (verified)

| feature | renderer | checked by |
|---|---|---|
| shape layers (rect, ellipse, fill, stroke, transforms) | svg, canvas, **html** | `shapes` sample; `renderer: 'html'` is passed through by `KIT.lottie` and seeks like the others (row 5.3) |
| image assets (`assets[].p` a data URI or a path next to the film) | svg, canvas | `features` sample: an image layer, rotating |
| masks (animated path) | svg, canvas | a gold square revealed by an animated mask |
| track mattes (`td` / `tt`) | svg, canvas | a red square seen through a moving circle |
| gradient fills (`gf`) | svg, canvas | linear gradient |
| trim paths (`tm`) | svg, canvas | a stroked ring drawing on |
| repeaters (`rp`) | svg, canvas | four copies of a dot, fading |
| effects | svg | a keyed Fill effect (type 21); checked in svg only, not in canvas |
| text layers | svg | see below |
| expressions | svg | see below |

An image whose data is an SVG data URI draws in lottie-web but only as a grey placeholder in dotLottie (ThorVG): use PNG or JPEG
in files meant for both.

## Text layers

lottie-web draws text from **exported glyph outlines** (`chars` in the JSON, "include glyphs" when exporting from After Effects),
never from a system font: a text layer without them draws nothing and logs "Missing character from exported characters list".
Export with glyphs, or convert the text to shapes. With glyphs present a text layer seeks like any other (`text` sample, keyed
scale). `KIT.lottie` waits for `document.fonts.ready` before the first frame, so a web font that the page itself uses is not an issue.

## Expressions (row 5.5)

lottie-web evaluates After Effects expressions on every seek. Measured (`p6-lottie-lint.mjs`, three fresh page loads, t = 1):
a time-driven expression (`time * 180`, `Math.sin(time * 3)`, `value`) gives the same transform every time and passes
the shuffled-seek test; `wiggle(...)` and `random(...)` give three different transforms. So:

- `tools/checks/lottie-expressions.py` is a **gate**: it fails a film whose Lottie JSON files (or an inline copy in the film
  script, found by the compiled `$bm_rt` marker) use `wiggle`, `random`, `seedRandom`, `gaussRandom`, `Math.random`, `Date`
  or `performance.now` in an expression. Skip: `"qa": {"lottie-expressions": false}`.
- `tools/checks/lottie-expressions-info.py` is a WARN: any other expression is listed with its file and count (deterministic
  as far as tested, but an expression can read state that the self-check never exercised: look at stills).
- For wiggle, bake it in After Effects (Convert Expression to Keyframes) or drive it from `KIT.doodle.wobble2`.

## dotLottie (`.lottie`) (row 5.8)

`vendor/dotlottie/` is `@lottiefiles/dotlottie-web` 0.83.2 (MIT, [VENDORED.md](../../vendor/dotlottie/VENDORED.md)): the ES module
and the WASM engine, 1.4 MB. `tools/dotlottie.js` drives it from `render(t)`, never `play()`:

```js
// after tools/engine.js and tools/runtimes.js
const d = KIT.dotLottie(KIT.el('div', 'box'), '../assets/lottie/demo.lottie',
  { t0: W('hook', 'icon'), animation: 'intro', theme: 'dark',
    schedule: [{ at: W('hook', 'swap'), animation: 'loop' }, { at: W('cta', 'go'), theme: 'brand' }] });
// render(t): d.set(t)
```

- **Multiple animations**: `animation` picks one from the archive; `schedule` switches animation (each entry restarts at its
  frame 0) and theme at film times, so any seek order gives the same frame. The archive's own frame rates are honoured.
- **Themes**: `theme` / a schedule entry's `theme` is a theme id of the archive (slots, v2 layout `a/ t/ s/`; the v1 layout
  `animations/ themes/` works for plain playback). Verified: the box colour follows the theme.
- **State machines**: dotLottie's own state machines run on a real-time clock and respond to pointer events; they cannot be
  seeked, so they are not played. Their purpose (switching states) is the `schedule`: decide in the film when each state shows.
  `add-lottie` lists a machine's presence and says so.
- **Offline**: the module and the wasm are read from `vendor/dotlottie/` (the wasm through a `blob:` URL), so the player's CDN
  fallback is never reached. The self-check asserts the page asks the network for nothing.

`reelwright add-lottie [project] x.lottie [name]` unpacks the archive into `assets/lottie/<name>/` (`hf/assets/lottie/` for a
HyperFrames film) next to a copy of `<name>.lottie`, plus `index.json` (every animation's size, fps, frames, duration, expression
count; themes; state machines; warnings) and prints the `KIT.dotLottie` and `KIT.lottie` lines to paste. The plain JSON
animations play in lottie-web (`KIT.lottie`, no WASM, no themes): use that when you do not need themes. A `wiggle` / `random`
expression in an animation is reported at add time (and fails the qa gate later).

Not covered: the WebGL / WebGPU builds, workers, interactive features (pointer listeners), audio layers in dotLottie 2.
