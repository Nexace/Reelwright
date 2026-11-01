# Reproducible builds

`reelwright encode` writes `<out>.manifest.json` beside the mp4:

- **tools**: node, python, ffmpeg, Chromium, Playwright and edge-tts versions, and the vendored HyperFrames commit;
- **inputs**: the sha256 of every file in the project except build output (`frames*`, `stills*`, `out/`, `.cache/`),
  the theme, and `tools/`. The fonts a theme uses are inlined into the project's generated `theme.css`, so they are
  covered by its hash;
- **output**: the mp4's duration, the frame count and the sha256 of every frame.

`reelwright verify` checks the inputs first and names any that changed. Then it renders the frames again into a
temp folder with the frame cache off and compares the count, the duration and every frame's hash. It never re-voices:
edge-tts is an online service and its mp3s are not byte-stable, so `vo/` is an input, not something verify rebuilds.

## Same machine

Frames must be identical, and are: a pvk frame is a pure function of t (the engine rebuilds the layout after each
`render(t)`, so no tile rastered for an earlier frame survives into the next), and HyperFrames renders on Chromium's
software path.

## Another OS (or another Chromium)

The same film renders the same picture, but not always the same bytes. What can differ:

- **Chromium software-raster noise.** Anti-aliased edges of scaled or moving layers can come out a few levels apart
  between Linux, macOS and Windows: CI measured 1–3 HyperFrames frames differing in 2–22 pixels, by at most 21/255.
  `verify` against a manifest from another platform therefore allows `.github/framediff.py`'s tolerance (at most 64
  pixels per frame off by more than 2/255), which needs the original `frames/` beside the manifest to measure.
- **Font hinting.** Bundled fonts are the same files everywhere, but each OS rasterises glyph edges with its own
  hinting and gamma; system fonts (a film without a theme falls back to them) can be different fonts altogether.
- **The ffmpeg/x264 build.** Encoders differ between builds and versions, so mp4 bytes are never compared; frame
  hashes and the duration are.
