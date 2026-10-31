# Phase 5 spec: preview, speed and repeatability

Branch `phase-5-preview-speed`. Status: draft, waiting for OK.

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
