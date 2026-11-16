# Lottie and dotLottie

`KIT.lottie(el, data, { t0, speed, loop, renderer })` (tools/runtimes.js) plays a Lottie animation by seeking it from `render(t)`:
lottie-web 5.13.0 (`vendor/lottie/lottie.min.js`, the full player with expressions) stays paused and only `goToAndStop(frame, true)`
moves it, so a frame is a function of `t`. Basics and the other runtimes: [runtimes.md](runtimes.md). What is verified, what is
not, and `.lottie` files below. Every claim has a fixture in `tools/selfcheck/lottie.mjs`, `lottie-features.mjs`, `lottie-lint.mjs`
or `dotlottie.mjs`: each is seeked 12 times forward on one page and the same times shuffled on a fresh one, in pvk and in
HyperFrames, and the frames must match. `tools/selfcheck/runtimes.mjs` covers a shape animation on both renderers.

## Rules

- Use `KIT.lottie`, never `lottie.loadAnimation` (it autoplays): the `seekable-runtimes` gate fails it.
- Size the container in `--kit-u`, keep the animation inside the safe box, and put a still of its busiest frame in `stills`.
- Lottie files from other people carry licences: check before you ship one, and credit where asked.

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

`tools/selfcheck/lottie-features.mjs` adds six fixtures built in the check (animated mask path, alpha track matte, rotating
gradient, data-URI PNG image, text layer, `time`-driven expressions): identical pixels forward and shuffled, frames that move, no
console error. A feature not listed (3D layers, effects such as drop shadow or glow, merge paths) is untested: `stills` it before
trusting it.

An image whose data is an SVG data URI draws in lottie-web but only as a grey placeholder in dotLottie (ThorVG): use PNG or JPEG
in files meant for both.

## Text layers

lottie-web draws text from **exported glyph outlines** (`chars` in the JSON, "include glyphs" when exporting from After Effects),
never from a system font: a text layer without them draws nothing and logs "Missing character from exported characters list".
Export with glyphs, or convert the text to shapes. With glyphs present a text layer seeks like any other (`text` sample, keyed
scale). `KIT.lottie` waits for `document.fonts.ready` before the first frame, so a web font that the page itself uses is not an issue.

## Expressions (row 5.5)

lottie-web evaluates After Effects expressions on every seek. Measured (`lottie-lint.mjs`, three fresh page loads, t = 1):
a time-driven expression (`time * 180`, `Math.sin(time * 3)`, `value`) gives the same transform every time and passes
the shuffled-seek test; `wiggle(...)` and `random(...)` give three different transforms. So:

- `tools/checks/lottie-expressions.py` is a **gate**: it fails a film whose Lottie JSON files (or an inline copy in the film
  script, found by the compiled `$bm_rt` marker) use `wiggle`, `random`, `seedRandom`, `gaussRandom`, `Math.random`, `Date`
  or `performance.now` in an expression. Skip: `"qa": {"lottie-expressions": false}`.
- `tools/checks/lottie-expressions-info.py` is a WARN: any other expression is listed with its file and count (deterministic
  as far as tested, but an expression can read state that the self-check never exercised: look at stills).
- For wiggle, bake it in After Effects (Convert Expression to Keyframes) or drive it from `KIT.doodle.wobble2`.

## dotLottie (`.lottie`) (row 5.8)

A `.lottie` file is a zip of Lottie animations, themes, images and state machines. One command takes it in,
`reelwright add-lottie`, and one zip reader backs it (`tools/dotlottie.mjs`: stored and deflated entries, v1 `animations/` +
`images/` and v2 `a/` + `i/`; encrypted entries, zip64 and paths that leave the folder are refused). Two ways to play it:

**The dotLottie player** (themes, several animations). `reelwright add-lottie [project] x.lottie [name]` unpacks the archive into
`assets/lottie/<name>/` (`hf/assets/lottie/` for a HyperFrames film) next to a copy of `<name>.lottie`, plus `index.json` (every
animation's size, fps, frames, duration, expression count; themes; state machines; warnings) and prints the `KIT.dotLottie` and
`KIT.lottie` lines to paste. A `wiggle` / `random` expression in an animation is reported at add time (and fails the qa gate later).
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

**Plain lottie-web** (no WASM, no themes). The unpacked JSON animations play in `KIT.lottie`. For one self-contained file,
`reelwright add-lottie [project] x.lottie --inline [out.json] [--animation <id>]` inlines the images as data URIs and writes plain
Lottie JSON to `<film or hf>/assets/<name>.json` (a file with several animations lists them; pick one with `--animation`). It
prints the line to use:

```js
const logo = KIT.lottie(el, 'assets/logo.json', { t0: KIT.W('intro', 'launch') });   // in render(t): logo.set(t)
```

`reelwright lottie [project] x.lottie [out.json] [--animation <id>]` is the old name of `add-lottie --inline`: a deprecated
alias, same arguments, same output.

Not covered: the WebGL / WebGPU builds, workers, interactive features (pointer listeners), audio layers in dotLottie 2.
