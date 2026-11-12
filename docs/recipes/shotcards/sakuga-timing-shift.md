# Sakuga timing shift

Animation on twos or threes, with the cadence shifting mid-shot and held key poses: smooth, then stepped, then a hold, then snap.

Card: video-shotcraft `sakuga-timing-shift` (1 shot), parity row `doodle-shots-motion:2.64`. Helper: `KIT.shotcards.steppedTime / sakugaTime` in `tools/shotcards/rhythm.js` (how to load: [README](README.md#loading)). Proved by `node tools/selfcheck/shotcards-a.mjs rhythm`: shuffled seeks in both renderers (pvk byte-identical, HyperFrames within raster noise), and a `check()` on the numbers.

## The code

```js
const time = KIT.shotcards.sakugaTime({ shifts: [{ at: 0, cadence: 1 }, { at: V('hit').start, cadence: 3 }], holds: [{ at: V('hit').end, dur: 0.2 }] });
function render(t) {
  const u = time(t);                     // the stepped clock: feed it to the animation you want stepped
  hero.style.transform = `translateX(${KIT.lerp(0, 900, KIT.seg(u, 7.5, 8.7))}px)`;   // the camera and everything else keep using t
}
// one value on twos without a clock: KIT.shotcards.steppedTime(t, 2)
```

## Numbers (ours; the source card gives none)

- `steppedTime(t, cadence, fps = 30)` holds each pose for `cadence` frames; cadence 1 or less is smooth. `sakugaTime` first subtracts the holds (the clock freezes for `dur`, later time lags by the sum), then steps with the latest cadence whose `at <= t`.
- The result is monotonic and never ahead of t.

## Common mistakes

- Stepping the camera too: it looks like dropped frames, not style.
- `KIT.easing('steps(n)')` quantises progress inside a tween; this quantises time across the shot. Use whichever matches the intent.

[Back to the shotcards index](README.md)
