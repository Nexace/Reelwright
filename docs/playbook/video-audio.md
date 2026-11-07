# Video clips and extra audio (`KIT.video`, `KIT.audio`)

Opt in with `tools/media.js` after the engine: `<script src="kit/media.js"></script>` (hf) or
`<script src="../../../tools/media.js"></script>` (pvk). Films that don't load it render and encode exactly as before.

```js
const S = V('demo');   // times come from W(), V(), KIT.snap(), like everything else
const clip = KIT.video('media/take.mp4', { id: 'take', start: S.start, dur: S.end - S.start + 0.4,
  in: 2.0,                                                       // source seconds to start from
  ramp: [{ t: 0, v: 1 }, { t: 1.2, v: 0.35 }, { t: 2.4, v: 1 }],  // or rate: 1.5 (0.1–10)
  audio: true, volume: 0.6 });                                    // mix the clip's own sound in
KIT.audio('media/whoosh.wav', { start: W('demo', 'fast'), in: 0, out: 1.2, gain: 0.5, fadeIn: 0.05, fadeOut: 0.3 });
// in render(t): position and style `clip` like any element (css(clip, {...}), show(clip, op), KIT.grade(clip, ...))
```

- `ramp` points are `{t, v}`: `t` seconds from the clip start, `v` the speed. Speed is interpolated in log space and
  source time is its integral (ported from HyperFrames `speedRamp.ts`), so both renderers show the same source frame.
  Bent segments (`curve`, `viaX`) are not supported.
- The clip shows only inside `[start, start + dur)`. Past the end of the source, pvk holds the last frame and
  hyperframes may hide it (not checked), so keep `dur` inside the source.
- `audio: true` clips and `KIT.audio` are mixed over `mix.wav` at encode (`amix normalize=0`, so `gain` is linear and
  nothing else moves). With no `mix.wav` you get the clips alone. A ramp's sound is cut into 0.25 s slices, each
  time-stretched with `atempo` (pitch kept), as HyperFrames does. The clip list is written by `info`
  (`.cache/media-audio.json`), so run `film`/`all`, not a bare `encode`, after changing it.
- `mix.py` doesn't see these sounds: there's no ducking under them, and `qa` checks loudness on the final mp4, so a
  loud clip can push the film over its loudness target. Keep `gain` low (0.3–0.6 under VO) and re-run `qa`.

| | pvk | hyperframes |
|---|---|---|
| element returned | `<img>`: the renderer extracts frames with ffmpeg at the film FPS into `.cache/video/<key>/` (Playwright's Chromium can't decode H.264) | `<video muted>` with `data-start/-duration/-media-start/-playback-rate/-automation`; the producer extracts and draws the frames |
| media path | relative to `film/` | relative to `hf/` (the producer serves only that folder) |
| `rate`, `ramp`, `in` | yes | yes |
| `audio`, `KIT.audio` | yes (encode) | yes (encode; the producer's own audio is not used) |
| stills | exact frame | nearest frame of a 10 fps extraction |

Checked with a clip whose frames carry their index as binary stripes: at 30 fps, every frame of a 1× clip with `in: 2`
and of a `0.5 → 3 → 1` ramp showed the same source frame on both renderers; the mixed audio had the beep and the
clip's 440 Hz tone (still 440 Hz through the ramp) exactly in their windows, and `qa` passed.
