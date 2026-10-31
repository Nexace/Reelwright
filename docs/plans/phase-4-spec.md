# Phase 4 spec: captions, audio and quality

Branch `phase-4-captions-audio-qa`. Status: spec approved 2026-11-01 with the three defaults; built. Done: exit test passed locally and on CI (run 41245317577).

## 4a. Captions and languages

**Word timings (already there).** `tools/vo.py` already asks edge-tts for `WordBoundary` events and `sched.py`
writes absolute word times into `VO[id].words` for both renderers. No change beyond a check that every line has words.

**Karaoke captions.** `KIT.subtitles` (engine.js, so both renderers already share it) gets: the word being spoken
marked `.now` (new token `--kit-sub-now`, default = `--kit-sub-said`, so old films look the same unless a theme sets
it), and rows that wrap to at most two lines inside `KIT.safe.w` instead of `nowrap`. Themes get a `--kit-sub-now`
value where it helps.

**Subtitle files.** `encode` (shared `encode()` in `tools/renderers/pvk.mjs`, used by both renderers) writes
`<out>.srt` and `<out>.vtt` next to the mp4 from `timeline.json` VO: one cue per ≤ 42-character chunk, split on
word boundaries, timed by the words.

**Other languages.** In `project.json`:
```json
"langs": { "es": { "voice": "es-ES-AlvaroNeural", "lines": { "hook": "Películas de producto, escritas como código.", "...": "..." } } }
```
`--lang es` on any command: `vo.py` voices those lines into `vo/es/`, `sched.py` places them (the timeline reflows
to the new lengths), captions and `.srt/.vtt` follow, output is `out/<name>-es.mp4` (suffix order: lang, style, format).
Cues written in film.js against English words (`W('chart', 'beat')`) keep working: `sched.py` stores where each
base-language word falls in its line (0..1), and `KIT.W` falls back to that fraction of the translated line.
On-screen copy written in film.js stays as written (not translated). Missing a line in `langs.es.lines` is an error.

## 4b. QA gates and music drops

`reelwright qa` keeps today's blip/blank report and adds gates, each printing `PASS`/`FAIL` with the time or frame;
any `FAIL` exits non-zero (so `all` fails too). Per-project opt-outs in `project.json` `"qa": { "<gate>": false }`.

| Gate | How |
|---|---|
| loudness | ffmpeg `ebur128` on the mp4's audio: integrated within ±1 LU of `loudness`, true peak ≤ −1 dBTP |
| captions | a page check (Playwright, both renderers' `index.html`, `window.render(t)` at each VO line's middle and end): row inside `KIT.safe`, ≤ 2 lines, WCAG contrast ≥ 4.5 between said/now colour and the caption background (composited over the stage background) |
| flash | per-frame mean relative luminance (whole frame and quadrants, so a flash ≥ 25 % of the screen counts): more than 3 flashes in any 1 s fails (WCAG 2.3.1 general-flash rule; red-flash rule not covered) |
| illustrative | page check every 0.5 s: if visible text (outside captions) shows a number, an "Illustrative data" label must be visible too; `"qa": {"illustrative": false}` when the numbers are real |
| seekable | static lint of the film's own code (`film/*.js` or `hf/film.js`, `hf/index.html`, `hf/blocks/`): `Date.now`, `performance.now`, `new Date()`, `Math.random`, `requestAnimationFrame`, `setTimeout/Interval`, CSS `transition`, `<video autoplay>` — with file:line |

**Music drops.** `tools/beatgrid.py` finds the drop: the bar with the biggest loudness jump over the two bars before
it, where those bars sit below the track's median. It writes `drop_bar` and `drop` (seconds) into `music/grid.json`.
`sched.py` turns it into film time in `MUSIC.drop` (`project.json` `music.drop_bar` overrides; the synth bed uses
`drop_bar` as today). `KIT.drop()` returns that time; engine.js is shared, so it is also the HyperFrames helper.

**Teaser.** No real track exists in the repo. I'll export the built-in "drive" synth bed once as
`projects/teaser/music/track.mp3` (our own, no license issue), switch the teaser to it, and use `KIT.drop()` for the
flash and logo hit instead of `drop_bar`. A real track of yours can replace it later with no code change.

## Test film

`projects/qa-broken/` (HyperFrames, ~6 s): one over-long caption line, low-contrast caption brand colours, a 10 Hz
strobe, a "40%" with no label, a `Math.random()` call, and an unreachable loudness target (−6 LUFS with the −1.5 dBTP
limit). Not in `all` or the example set; CI runs `qa` on it and expects every gate to fail.

## Exit test

- Stills of `example-hf` show the spoken word highlighted on time.
- `.srt` and `.vtt` from `example-hf` open in a player (checked with `ffprobe` on both).
- `example-hf --lang es` builds: video length = mix.wav, captions in Spanish and in sync.
- `qa qa-broken` fails all five gates, each naming a time/frame/file; `example`, `example-hf`, `layouts-hf` pass.
- Teaser: detected drop = bar 2 of the bed; stills show flash and logo hit on it.
- `example` (pvk) still 1378 frames, 22.952 s; CI green on all three OSes.

## Not in this phase

Machine translation, translating on-screen copy in film.js, red-flash detection, live preview (Phase 5).

## As built (differences from the plan above)

- Drop detection works per beat on the low band (< 150 Hz): bar-level loudness depended on the downbeat guess,
  which is ambiguous with four-on-the-floor, and a riser before the drop pulled it a beat early.
- `beatgrid.py` lets 12 kicks (was 20) set the beat phase, so short tracks don't lock to off-beat hats; `sched.py`
  keeps the beat phase within ±half a beat so `KIT.bar(k)` can't slip a whole beat.
- The teaser's track is the drive bed exported 2 bars longer (drop at its bar 4, `music.start` 3.75 s), so the
  fit has enough beats and the start offset is exercised.
- "illustrative" counts data-like numbers only (40%, $12, 3×, 2.5k, 1,200, 4.8), not step numbers like "01".
