# Animation runtimes: GSAP, Lottie, anime.js, Three.js, CSS/WAAPI (checkpoint 10b)

Replaces the PLAYBOOK sections "GSAP (optional)" and "Lottie (optional)" when 10z stitches this in: the libraries are now
bundled in `vendor/` and driven by `tools/runtimes.js`. The KIT helpers (`KIT.keys`, `KIT.easing`, layouts) still cover most
films; reach for a runtime for label-based choreography over many elements, SVG/text plugins, an After Effects export, or 3D.

## The rule

Every library is paused at load and only ever **seeked** from `render(t)`: `h.set(t)` (or `KIT.animations(t)`) inside
`render`, nothing else moves it. Loading finishes before the first frame (`READY` waits; HyperFrames waits through
`window.__hfTimelinesBuilding`). HyperFrames' own adapters also seek what they find, but its root timeline — our
`render(t)` — seeks last, so the helpers decide every frame. Times come from `W()` / `V()` / `KIT.snap()`, as everywhere.

## Loading

| Runtime | pvk `film/index.html` (after `../../../tools/engine.js`) | HyperFrames `hf/index.html` (after `kit/engine.js`) |
|---|---|---|
| GSAP + plugins | `../../../vendor/gsap/dist/gsap.min.js`, then each plugin you use | `kit/gsap/dist/…` (the `gsap/dist/` path keeps HF from swapping in its CDN) |
| Lottie | `../../../vendor/lottie/lottie.min.js` | `kit/lottie/lottie.min.js` |
| anime.js v4 | `../../../vendor/anime/anime.umd.min.js` | `kit/anime/anime.umd.min.js` |
| Three.js r187 | no tag: `KIT.three` imports `three.module.js` on first use | same |
| all | then `../../../tools/runtimes.js`, then `film.js` | then `kit/runtimes.js`, then `film.js` |

Bundled GSAP plugins: CustomEase, CustomWiggle, CustomBounce, EasePack (SlowMo, ExpoScaleEase), SplitText, DrawSVG,
MorphSVG, TextPlugin, Physics2D, PhysicsProps — `KIT.gsap` registers whichever are loaded. GSAP is **not MIT**: it is under
Webflow's "Standard No Charge" licence (`vendor/gsap/LICENSE-GSAP.md`); keep the banner in each file, and never expose
GSAP authoring in a visual no-code editor.

## API

```js
// GSAP: build(tl, gsap) adds tweens to a paused timeline at absolute times; primed once (end, then 0)
const g = KIT.gsap((tl) => {
  const chars = new SplitText(title, { type: 'chars' }).chars;      // split after fonts load (KIT.gsap waits for them)
  tl.fromTo(chars, { yPercent: 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: { each: 0.03, from: 'center' } }, KIT.snap(V('hook').start));
  tl.fromTo('#line', { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: KIT.dur(0.7) }, W('hook', 'fast'));
});
// Lottie: data = the JSON object (or a path); t0 = when frame 0 shows; loop wraps, otherwise it holds the last frame
const l = KIT.lottie(box, LOTTIE_JSON, { t0: W('hook', 'icon'), speed: 1, loop: false, renderer: 'svg' });   // or 'canvas'
// anime.js v4: return animate()/createTimeline() results with autoplay: false; positions in ms
const a = KIT.anime((A) => A.createTimeline({ autoplay: false }).add('.dot', { y: [40, 0], delay: A.stagger(60) }, W('hook', 'dots') * 1000));
// Three.js: build(THREE, renderer, { w, h }) → { scene, camera, update(t) }; the canvas fills `el`
const s = KIT.three(el, (THREE, renderer, { w, h }) => { /* scene, camera, meshes */ return { scene, camera, update: (t) => { mesh.rotation.y = t; } }; });
// CSS @keyframes and element.animate(): authored as usual (finite, fill both); currentTime = t s after load
function render(t) { g.set(t); l.set(t); a.set(t); s.set(t); KIT.animations(t); }
```

CSS animation delays are times on the film clock: set them from the VO (`el.style.animationDelay = W('end', 'go') + 's'`).
anime.js writes nothing before a tween starts, so give its targets their "before" look in CSS (e.g. `opacity: 0`).

## Banned (the `seekable-runtimes` QA gate, `tools/checks/seekable-runtimes.py`)

| Path | Why | Use instead |
|---|---|---|
| GSAP ScrambleText | calls `Math.random` on every render | a seeded scramble from `KIT.doodle.hash` |
| `stagger: { from: 'random' }` (GSAP, anime) | `Math.random` | `'center'`, `'edges'`, `'end'`, an index, or a seeded order |
| RoughEase / `rough(…)` | `Math.random` | CustomWiggle `easeOut` / `uniform` / `anticipate` |
| CustomWiggle `type: 'random'` | `Math.random` | the other wiggle types |
| `utils.random` / `utils.shuffle` (GSAP, anime) | `Math.random` | a seeded function of an index |
| MotionPath | differed under shuffled seeks (first frames, after the end was visited) | `KIT.path` (checkpoint 10e) |
| `.play()`, `repeat: -1`, `gsap.ticker.add`, ScrollTrigger, Draggable, Observer | real-time playback | seek from `render(t)` |
| global `gsap.to/from/fromTo(…)` | runs on GSAP's real-time ticker | add it to the `KIT.gsap` timeline |
| `autoplay: true` | real-time playback | leave it off (the helpers do) |

Not bundled: ScrollTrigger and the other interactive plugins, GSDevTools, MotionPathHelper, Flip and CSSRulePlugin
(seek behaviour unverified), the `.map` files.

## Verified (`node tools/selfcheck/runtimes.mjs`, CI on macOS, Windows, Ubuntu)

Each runtime, in both renderers: page A seeks 12 times forward, page B (a fresh browser) the same times shuffled. pvk
screenshots are byte-identical; HyperFrames screenshots are identical or within its software-raster noise (the
`.github/framediff.py` rule: ≤ 64 px off by more than 2/255 — measured 0 px), because HF's seek path has no re-raster step.
Covered: GSAP timeline + `fromTo` + stagger from center, SplitText chars, DrawSVG, MorphSVG, CustomEase, CustomWiggle
(easeOut), CustomBounce, TextPlugin, SlowMo, ExpoScaleEase, Physics2D, PhysicsProps; Lottie shape layers (group,
rounded rect, fill, stroke; position/rotation/opacity/scale keys) with SVG and canvas renderers, `t0`, `speed`, `loop`;
anime.js v4 timeline, keyframe arrays, `stagger` from center, colour and border-radius tweens; Three.js r187 WebGL
(standard materials, lights, perspective camera); CSS `@keyframes` (delay, iterations, alternate) and `element.animate()`.
`projects/runtimes-hf` (`"ci": true`) renders all five through the real HyperFrames producer.

Rules the test found:
- **Physics2D / PhysicsProps read their start values lazily.** Give a physics tween its own element: another tween on
  the same element made frames depend on seek order.
- **Use `fromTo()`.** `KIT.gsap` primes the timeline (end, then 0) so `.from()` and relative values resolve once, but
  only `fromTo()` was tested.
- **No `autoSplit`** on SplitText (it re-splits on resize/font events, outside `render(t)`).

Not tested: Lottie masks, mattes, gradients, text, images and expressions (expressions may call `random`/`wiggle`: test a
file before relying on it); dotLottie (`.lottie`); Three.js loaders, textures and post-processing; WebGL on a real GPU
(renders use software GL, which is what makes frames match across machines).

## Notes

- Three.js is ES modules only since r160: `KIT.three` imports it with `import()`. pvk pages run under
  `--allow-file-access-from-files`, so this works from `file://`; preview and HyperFrames serve over http.
- HyperFrames' producer wraps `gsap.timeline()` in a proxy that queues tweens and flushes them later; `KIT.gsap` builds
  on the real timeline underneath (`__hfReal`), so the timeline is complete when it is primed.
- engine.js re-rasters each pvk frame by hiding `<body>` for a moment, which restarts CSS animations; `runtimes.js` seeks
  them again after that step.
