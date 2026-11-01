# Phase 5 spec: preview, speed and repeatability

Branch `phase-5-preview-speed` (built on `phase-5-work`). Status: built; local exit test passed on macOS (see "As built"); CI not run yet.

## 5a. Preview and speed

**Live scrubber: `reelwright preview [project]`.** A dependency-free `node:http` server on `localhost:4173` serving the
repo root (so the film's `../../../tools/` paths resolve), and a page `tools/preview.html`:
- an iframe of the project's own `film/index.html` (pvk) or `hf/index.html` (HyperFrames, loaded without the runtime as
  `info` already does: the same `render(t)` the HF timeline seeks), at the project's frame size, CSS-scaled to fit;
- a slider stepping whole frames (1/fps) that calls `render(t)`; ←/→ one frame, shift ±1 s, space plays (approximate);
- the `mix.wav` waveform (WebAudio decode, canvas) under the slider, with VO line spans, SFX cues, beats and bars
  from `FILM.MUSIC`, and the drop marked;
- reload on change: `fs.watch` (recursive) on the project and `tools/engine.js|kit.css|layouts.js` sends an SSE event;
  the iframe reloads and returns to the same t. A `project.json` change shows "script changed: run `reelwright audio`".
- `--style` applies, same as for the other commands. Frame size comes from `project.json`.

**Incremental rendering (pvk `frames`).** Instead of guessing which inputs a shot depends on, the renderer
fingerprints what each frame actually shows. After `render(t)` it hashes the stage's `outerHTML`, the `currentTime`
of every `<video>`, non-zero `scrollTop/Left`, and the pixels of any `<canvas>`. A global key adds hashes of every file
the page loaded (it logs requests: css, js, fonts, images, clips), the frame size, and the Chromium version. A frame
whose key is already in `<project>/.cache/frames/` is copied from the cache. Otherwise it is screenshotted and stored.
The report counts re-rendered frames and groups them into shots (runs of consecutive frames). This handles reflow and
film.js edits correctly, which per-shot input hashes can't: one edit to `data.js` would invalidate every shot.
`--no-cache` turns it off, and `clean` deletes `.cache/`. The known run-to-run variance at t≈15 s in `example` gets
root-caused first, because the cache has to rely on frames being deterministic.

**HyperFrames.** The vendored producer splits renders into frame segments internally. If its public API accepts a
frame range, I use the same fingerprint pass to choose the ranges. If it doesn't, HF films render in full during
Phase 5, and the docs say so. Patching vendored code just for this isn't worth it.

## 5b. Remix and reproducible builds

**`reelwright remix [project]`.** Builds three stills (the film's 25 %, 50 % and 75 % marks) in three looks that differ
from the current one. It picks the three themes in `themes/` that are furthest from the project's own (palette
distance plus font family) and pairs them with the three formats 16x9, 9x16 and 1x1. Output: one contact sheet,
`stills-remix/sheet.jpg`, with each row labelled by its theme and format. Layouts are set in film code, so remix
can't swap them; the variety check below does read them.

**Variety check.** Each film's resolved look is fingerprinted: the theme's palette tokens, its font families, and the
`KIT.layout.<name>` calls in its film code. The check compares that against every other project in `projects/`.
It warns (`WARN`, not a failure) when another film uses the same theme, or has the same fonts plus a palette
within ΔE < 10 and the same layouts. It runs inside `remix` and as a `qa` line.

**Manifest: `<out>.manifest.json`, written by `encode`.** It records:
- tool versions: node, python, ffmpeg, Chromium, Playwright, edge-tts, and the vendored HyperFrames commit from
  `VENDORED.md`;
- the sha256 of every input: `project.json`, film/hf code, themes, the fonts used, `vo/`, `music/`, `mix.wav`, and
  the tools;
- the output's duration and frame count, and a sha256 per frame.

**`reelwright verify [project]`.** First checks that the input hashes still match the manifest, and names any input
that doesn't. It then re-renders frames into a temp dir with the cache off and compares the per-frame hashes and the
duration. It never re-voices, because edge-tts is online and not byte-stable. On the same machine it requires
identical frames. Against a manifest from another OS it applies the Phase 2 tolerance (`.github/framediff.py`).
`docs/` gets a short "what can differ across OSes" note covering Chromium software-raster noise, font hinting, and
the ffmpeg/x264 build (mp4 bytes are never compared).

## Exit test

- Preview at 5 chosen t on `example` and `example-hf`: an iframe screenshot equals `stills` at the same t (pvk exact,
  HF within the framediff tolerance).
- Change one on-screen caption in `example`'s film.js: `frames` re-renders only those frames (reported as one shot),
  and the result is byte-identical to a clean `--no-cache` build.
- `remix example-hf` shows three visibly different looks; a copy of a project with the same theme trips the variety WARN.
- `verify example` passes twice in a row; it fails and names the input after a theme edit.
- `example` (pvk) still 1378 frames, 22.952 s; CI green on all three OSes.

## Not in this phase

Incremental HF rendering via a vendored patch, audio caching (audio steps are already fast), comparing mp4 bytes.

## As built (differences from the plan above)

- **The t≈15 s flake, root-caused.** It was not one frame: three 4-page renders of `example` differed in 50–370
  frames, all in the phone shot (7.6–17.4 s), by up to 32/255 on anti-aliased edges (the phone's corners, shadow and
  screen edge, caption and subtitle glyphs). Chromium keeps a composited layer's tiles while the layer only moves, so
  those edges keep the sub-pixel offset of whichever earlier frame rastered them; a frame depended on where its page
  started rendering (start at frame 353 → match, 354 → differ) and on raster timing. `--disable-partial-raster`
  removed the run-to-run part but not the history part. Fix: `window.render` (tools/engine.js) rebuilds the layout
  after `render(t)` (body `display: none`, reflow, back), so every frame is fully re-rastered. Three full renders,
  and renders starting mid-shot on one page, are now byte-identical. Cost: `frames example` 18 s → 22 s. Frames moved
  by a few levels on those edges compared with Phase 4 output (1378 frames, duration unchanged).
- **Fingerprint skips what can't paint.** Hashing the whole `outerHTML` keyed every frame on a caption that is only
  shown later (hidden elements stay in the DOM), so one caption edit re-rendered all 1378 frames. The fingerprint walks
  the body instead and leaves out `display: none` subtrees and out-of-flow (absolute/fixed) subtrees with opacity 0 or
  visibility hidden; in-flow hidden elements stay in, since they move their neighbours. Shadow roots are included.
- **Scripts are not in the global key.** What film.js, data.js and clip.js do lands in the DOM, which is
  fingerprinted; if they were hashed, a film.js edit would re-render every frame. Everything else the pages request
  (index.html, css, fonts, clip images) is hashed, plus the parsed CSSOM once per render (shortcut: CSS rules a film
  inserts per frame from JS aren't seen; nothing does that today).
- **Theme fonts are inlined, and usable while the film loads.** The HF preview didn't match HyperFrames frames: film
  code that measures text at load (example-hf centres its chart with `offsetHeight`) got the fallback face in our
  pages (fonts `loading 0/4` when film.js ran: label 25 px vs 29, chart 596 vs 603) but the real one in the producer,
  which inlines fonts. `tools/theme.mjs` now writes fonts as data: URLs and the engine registers them as `FontFace`
  objects from the bytes, which are usable at once. HyperFrames frames are byte-identical to before; pvk films with a
  theme now lay out with the real font in `frames`, `info` and `qa` too. Fonts are no longer copied to `hf/kit/fonts/`.
- **HyperFrames stays a full render.** `executeRenderJob` (what we call) takes no frame range. The producer's
  distributed API does (`plan()` then `renderChunk(planDir, i, out, { frameRange })`), but that is a separate capture
  pipeline with a plan directory and an ffmpeg-version pin, and whether its frames equal `executeRenderJob`'s is
  untested. example-hf renders 337 frames in 7–9 s, so this was left for Phase 7 (cloud rendering uses that API).
- **Manifest** is `<out without .mp4>.manifest.json` (beside the `.srt`/`.vtt`), not `<out>.manifest.json`. Inputs
  are every project file except build output, the theme and all of `tools/`; fonts are covered through the inlined
  `theme.css`. The duration is the mp4's (ffprobe format duration); verify accepts frames/fps within one frame of it.
  Against a manifest from another platform or Chromium, verify applies framediff only when the original `frames/` is
  beside the manifest (the tolerance needs the pixels); otherwise it fails and says so. Notes: docs/REPRODUCIBLE.md.
- **Variety check**: films with neither a theme nor brand.json are skipped (their look is in their own CSS, which the
  check can't read; otherwise every pvk sample would match every other on kit defaults). It prints `PASS`/`WARN`/
  `SKIP  variety` as the last `qa` line and never changes the exit code. Fonts compared: display and text families;
  palette: bg, ink, muted, accent, surface (mean ΔE76).
- **remix** takes the three furthest themes by palette ΔE plus 25 for a different display face and 15 for a different
  text face (example-hf: playful, swiss, editorial). The user's own `stills/` is parked and restored.
- **Preview** reloads the whole page (iframe and waveform) on a change and returns to `#t=`; the "script changed"
  banner stays until data.js / kit-data.js changes (sched ran). Play uses WebAudio from the decoded `mix.wav`.
  `?fit=0` shows the film at 100 % (the exit test screenshots it there). For HyperFrames films the server adds the
  producer's `html,body,*{text-rendering:geometricPrecision}` rule to hf/index.html (the producer compiles it into the
  page it renders); without it glyph edges differed in 4–8k px per frame.
- CI: one more step after the example build, `verify` and a cached `frames` re-run.

### Exit test (macOS, local)

- Preview vs stills, `example` at 2, 6.5, 9.25, 15, 21 s: iframe screenshots byte-identical to `stills` (5/5, also
  after the font fix).
  `example-hf` at 1, 3.5, 6, 8.2, 10.5 s, compared with the renderer's frames at those t (the PNGs stills are cut
  from): 2 identical, 3 off by at most 2/255 with 0 px beyond framediff's noise threshold, so within tolerance. Before
  the font fix and the text-rendering rule, 4 of 5 were off by 4220–39507 px.
- Caption edit (`'Add in one tap'` → `'Add with one tap'`): `frames` re-rendered 260 frames in 1 shot, 367–626
  (6.12–10.45 s), 1118 from cache, 8 s; byte-identical to a clean `--no-cache` build (0 of 1378 differ).
  Re-run after the font fix: same result.
- `remix example-hf`: playful 16x9 (yellow, rounded face), swiss 9x16 (white, red rule, grotesk), editorial 1x1
  (cream, serif): three clearly different looks on `stills-remix/sheet.jpg`. The 50 % still catches the wipe as it
  fades. Variety: a copy of example-hf (`reelwright new … --renderer hyperframes`) gives `WARN variety same theme
  "dark-tech"` both ways; with the copy gone, `PASS`.
- `verify example` passed twice in a row (248 inputs, 1378 frames identical, 1378 frames = 22.967 s vs mp4 22.952 s),
  and once more after the font fix; after appending a rule to `tools/kit.css` (the default theme of this no-style
  film) it failed with `tools/kit.css (changed)`.
- Preview auto-reload: with preview.html open at 9.25 s, touching film.js reloaded the page back at `#t=9.250`,
  frame 555, with identical iframe pixels.
- `example`: 1378 frames, mp4 22.952 s. CI: not run (not pushed).
