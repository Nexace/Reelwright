# Motion blur

Opt-in, per project:

```jsonc
"motionBlur": true                              // 180° shutter, 8 samples
"motionBlur": { "shutter": 180, "samples": 8 }  // shutter in degrees (360 = a full frame of smear)
```

| renderer | how |
|---|---|
| pvk | each output frame f is the average of `samples` renders of `render(t)` at `t = f/FPS + (i/samples − 0.5) · shutter/360/FPS` (clamped at 0), averaged with ffmpeg `tmix` (premultiplied when `output.alpha`). The frame cache is skipped, and a render costs about `samples` times as long |
| hyperframes | the producer's own sub-frame blur: `motionBlur: {shutterAngle, samplesPerFrame}` is passed in the render request and seeks `window.__hf.seek(t)` at the sub-times, so it works on `render(t)` films. Costs about `samples` times as long |

Blur is centred on the frame time (a 180° shutter smears ±¼ frame). Use it for fast pans, wipes and sliding cards;
leave it off for text that sits still and for screen recordings, which already carry their own blur. Because every
sub-frame is a pure `render(t)`, nothing in the film changes; do not add your own blur to the same motion.

## Per-shot shutter — `KIT.shot.shutter(deg, from, to)`

A project-global 180° is a compromise: a fast action shot wants 270–360° and a crisp UI shot wants 90°. Load
`kit/shutter.js` after `kit/shots.js` and register windows in film time; the pvk renderer asks
`window.__reelwrightShutter(t)` for each frame and keeps the global value outside every window (and with nothing
registered). Register the windows at load (top level of film.js), never inside `render(t)`. `deg` is 0–360, `from`/`to` are seconds (`KIT.shot.shutter(270, { from: t0, to: t1 })` also works).

```js
KIT.shot.shutter(320, t0, t1);   // the action shot: a long smear
KIT.shot.shutter(90, t2, t3);    // the UI shot: crisp
```

The default is unchanged: `"motionBlur": true` is still 180° and 8 samples, and a film that never loads `shutter.js`
renders the same frames as before. Motion blur must be on for a shutter to do anything (the `shot-shutter` qa gate
fails a call on a film without it). HyperFrames takes one `motionBlur` for the whole producer run, so per-shot windows
are pvk-only there; the qa gate prints a WARN for a hyperframes film that registers them.

Checked by rendering a box moving 500 px/s at 30 fps: sharp edges become ramps about 8 px wide (pvk, 180°) and the
hyperframes frame spreads a 1500 px/s box over about 25 px each side.
