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

Checked by rendering a box moving 500 px/s at 30 fps: sharp edges become ramps about 8 px wide (pvk, 180°) and the
hyperframes frame spreads a 1500 px/s box over about 25 px each side.
