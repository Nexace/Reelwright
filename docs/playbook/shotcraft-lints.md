# Shotcraft: sharp camera, velocity helpers, the energy arc, aesthetic lints, beat-sync and A/V checks

Everything here is opt-in: nothing runs on a film unless you call it or switch it on in `project.json`.

## Sharp camera layer (`tools/p10-sharp.js`)

`KIT.shoot(el, state)` films with `scale(z)`: Chromium rasterises the layer at its native size and scales the texture, so small
text softens under a deep zoom or a 3D tilt. Pass `{ sharp: true }` and the layer is zoomed by layout instead (CSS `zoom: z`):
text is laid out and rasterised at its final size. Same camera state, same picture, crisper type.

```html
<script src="kit/shots.js"></script><script src="kit/p10-sharp.js"></script>
```
```js
KIT.shoot(cam, S.orbit({ t0, t1 })(t), { sharp: true });      // cam = a layer that fills the frame
KIT.camCSS(state, { sharp: true });                           // { zoom, width, height, transformOrigin, transform, filter }
```

- The layer's box must start at the frame's top-left and fill it: the helper sets its width and height in px. A layer that is not
  frame-sized (a card, a bleed floor) goes inside a frame-sized wrapper (the `.cam` of `projects/shots-hf`).
- A marker lands where `scale()` puts it, within 0.05 px, in 16x9 and 9x16 (`tools/selfcheck/motion/p10-sharp.mjs`); text boxes
  differ by a rounded line box because they are re-laid out at the zoomed size.
- Headless screenshots re-raster every frame, so the pixel gain shows only where a compositor reuses a layer's texture. One
  measured gain: the Ink Press template, under shuffled seeks in HyperFrames, differed by about one pixel on every circle edge
  with `scale()` and is identical with `sharp: true`.
- Without the option, the call goes straight to `tools/shots.js`.

## Velocity helpers (`tools/p10-motion.js`)

State-free, so safe in `render(t)`: `KIT.velocityAt(fn, t)` (central difference, units per second, number / array / object),
`KIT.lagged(fn, t, tau)` (what an exponential follower of `fn` with time constant `tau` shows; trails by about `tau`) and
`KIT.dampedSettle(t, t0, { from, to, freq, zeta })` (a damped spring step; `zeta < 1` overshoots, 1 is critical, above 1 creeps).

## Energy arc (`reelwright arc <project>`)

A promo climbs: a **low open**, **one hero**, a **climb of features** with **breath cards** between, a **peak** close that is the
loudest shot, then a held end card, with the **hold frames budgeted first**. Put the plan in `project.json`:

```json
"arc": [ { "shot": "open", "role": "open", "bars": 2, "energy": 1, "hold": 1.0 }, { "shot": "hero", "role": "hero", ... } ]
```

Roles: `open hero feature breath peak end`; energy 1 (a whisper) to 9; `hold` in seconds of stillness inside the shot. `reelwright arc`
prints the arc and WARNs when the open is above the median, there is not exactly one hero (before the features), a feature is
quieter than the one before, three strong shots run without a breath, a breath is not quieter than its neighbours, **the closing
shot is not the loudest**, the end card holds the wordmark under 1 s, or holds are under 10% of the film. `--mix` also measures
`mix.wav` per shot and warns when the peak does not mix loudest. The Ink Press template ([recipe](../recipes/ink-press-promo.md)) is the worked example.

## Aesthetic rules as lints (`"qa": {"aesthetic-rules": true, "sfx-repeat": true}`)

| Rule | Lint | What it checks |
|---|---|---|
| R1 | `aesthetic-rules` | the wordmark (`data-wordmark`) is on screen, opaque and still for at least 1 s |
| R4 | `aesthetic-rules` | at most 3 whole-frame beat hits: `KIT.shake` onsets and crash zooms, hits within 0.5 s count once |
| Q11 | `aesthetic-rules` | captions at least 5% of the frame height in font size, other text at least 3% |
| Q3 | `aesthetic-rules` | no `KIT.handheld` drift while a product shot (`data-product`) is on screen |
| S2 | `sfx-repeat` | a repeated old SFX kind (click, tap, pop, whoosh...) within 0.6 s: the sample repeats at the same pitch and level |

The new kinds in `tools/mix.py` (tick, bubble, thud...) alternate pitch and step down by themselves, so repeats of those pass.
Both are WARN only and off by default (the first sweeps the film at 30 fps). Standalone: `node tools/checks/aesthetic-rules.page.mjs <project>`.

## Cutting on the beat (`reelwright beatsync <project>`) and A/V offset (`reelwright verify-av <project>`)

`beatgrid.py` fits the grid of the source track; `beatsync` checks the **rendered mp4**: kick (30-150 Hz), snare (150-2500 Hz)
and hat (6-14 kHz) hits from its audio; the share of grid beats that carry a hit and the median offset in ms (a wrong
`music.start` or a late track shows as a steady offset); and every hard cut's error in frames against the grid and the nearest
hit. WARN past 3 frames. Opt-in as a qa plug-in: `"qa": {"cut-on-beat": true}`.

`verify-av` measures the AAC priming (1024 samples: 21.3 ms, **1.28 frames at 60 fps**; ffmpeg and browsers hide it with the edit
list, a player that ignores the list plays everything that late), the global offset of the mp4's audio against `mix.wav`, and
the lag around every SFX cue. WARN past 1 frame. Opt-in: `"qa": {"verify-av": true}`. The per-kind `PEAK` table in `tools/mix.py` already
places synthesised SFX on their cue by construction (proved in `tools/selfcheck/sound.mjs`).

## Page capture trio (`reelwright capture-trio <url> <out>`)

`full@2x.png`, a transparent cutout PNG per element (`cutouts/`, nothing behind the element), and `layout.json` with each
element's box in page px and document order: what a floating-chip shot or a camera over a page needs. Mark the elements you want
with `data-capture`, or pass `--selector`. Read-only, like `capture_site`.

## Final review

[final-review.md](final-review.md): an itemised checklist and a reviewer with a clean context; `reelwright review <project>` prints the brief.
