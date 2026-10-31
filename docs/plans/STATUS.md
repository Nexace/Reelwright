# Status

Plan: [hyperframes-integration.md](hyperframes-integration.md). Mark a phase ☑ here and in the plan's Progress table when its exit test passes.

| # | Phase | Status | Notes |
|---|---|---|---|
| 1 | Foundation | ☑ Done | Spike: go ([spike-findings.md](spike-findings.md)). Example builds on macOS, Windows, Ubuntu CI: 1378 frames, 22.952 s, same as before. Known: one pvk frame (t≈15 s) varies run to run, pre-existing; look at it in Phase 5. |
| 2 | HyperFrames inside | ☑ Done | CI green on macOS, Windows, Ubuntu (run 41196105004). example-hf: 337 frames, 11.2 s; two frame builds byte-identical on macOS; Linux and Windows differ in 1–3 frames by a few pixels (2–22 px, up to 21/255: Chromium software-raster noise), so the exit test allows that tolerance (`.github/framediff.py`, agreed 2026-10-31); video vs mix.wav 0.021 s apart (< 1 frame); pvk example unchanged (1378 frames, 22.952 s). Vendored the published per-package builds, not `src/` (needs Bun), see `vendor/hyperframes/VENDORED.md`. Catalog: components only (blocks need GSAP + CDN fonts). Windows needed `vendor/** -text` (.gitattributes) so the HF runtime checksum holds. |
| 3 | Look and feel | ◐ Built, CI pending | Spec: [phase-3-spec.md](phase-3-spec.md). Local exit passed on macOS: example-hf builds in dark-tech, editorial, neon and in 16x9/9x16/1x1 (336 frames, 11.221 s = mix.wav each) with no film.js change; layouts-hf (kinetic, split, bento, stat, quote) passes QA; pvk example timeline still 22.952 s and its stills byte-identical. 17 OFL font families, all in fonts/LICENSES.md. HyperFrames reads the frame size from index.html on disk, so the renderer stamps it in per render and restores it. Brutalist's yellow accent is low-contrast as text on white. Mark ☑ when the CI matrix is green. |
| 4 | Captions, audio and quality | ☐ | |
| 5 | Preview, speed and repeatability | ☐ | |
| 6 | Film from a URL and style from a reference | ☐ | |
| 7 | Free cloud rendering | ☐ | |
| 8 | Docs, licensing, release | ☐ | |
