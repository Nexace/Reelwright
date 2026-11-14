# Lottie and dotLottie

`KIT.lottie(el, data, { t0, speed, loop, renderer })` (tools/runtimes.js) plays a Lottie animation by seeking it from `render(t)`: lottie-web 5.13.0 (`vendor/lottie/lottie.min.js`, the full player with expressions) stays paused and only `goToAndStop(frame, true)` moves it, so a frame is a function of `t`. Basics and the other runtimes: [runtimes.md](runtimes.md).

## What is tested

`tools/selfcheck/p8-lottie.mjs` builds six fixtures here and seeks each forward and shuffled in separate browsers (identical pixels, frames that move, no console error): a mask (animated mask path), a track matte (alpha matte, scaling ellipse), a gradient fill (rotating), an image asset (data URI PNG), a text layer (font from the page) and expressions (`time`-driven rotation and position). `tools/selfcheck/runtimes.mjs` covers a shape animation on pvk and hyperframes. A feature not listed (3D layers, effects such as drop shadow or glow, merge paths) is untested: `stills` it before trusting it.

## dotLottie (.lottie)

A `.lottie` file is a zip. `reelwright lottie [project] <file.lottie> [out.json] [--animation <id>]` unzips it (no dependency: stored and deflated entries, v1 `animations/` + `images/` and v2 `a/` + `i/`), inlines the images as data URIs and writes plain Lottie JSON to `<film or hf>/assets/<name>.json`. It prints the line to use:

```js
const logo = KIT.lottie(el, 'assets/logo.json', { t0: KIT.W('intro', 'launch') });   // in render(t): logo.set(t)
```

Not supported: dotLottie themes and state machines (the player features); play the animation from `render(t)` instead. A file with several animations lists them; pick one with `--animation`.

## Rules

- Use `KIT.lottie`, never `lottie.loadAnimation` (it autoplays): the `seekable-runtimes` gate fails it.
- Size the container in `--kit-u`, keep the animation inside the safe box, and put a still of its busiest frame in `stills`.
- Lottie files from other people carry licences: check before you ship one, and credit where asked.
