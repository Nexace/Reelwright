# Output formats, alpha, HDR, 4:5

All opt-in. A film with no `"output"` key encodes exactly the mp4 it always did.

```jsonc
// project.json
"output": { "format": "webm", "alpha": true, "crf": 24, "scale": 1 }   // or: reelwright encode <p> --as webm
```

| key | default | meaning |
|---|---|---|
| `format` | `mp4` | `webm` (VP9 + Opus), `mov` (ProRes), `gif`, `apng`, `png` (folder). `--as <format>` overrides it |
| `alpha` | `false` | transparent frames (see below); webm → `yuva420p`, mov → ProRes 4444 `yuva444p10le`, gif transparent palette, apng RGBA |
| `prores` | `4444` with alpha, else `hq` | `proxy`, `lt`, `422`, `hq`, `4444`, `4444xq` |
| `crf` | mp4 16, webm 24 | quality for mp4 and webm |
| `gifFps` | `15` | gif frame rate (loops forever, no audio) |
| `scale` | `1` | multiplies the size of the extra output (not the mp4) |
| `hdr` | `false` | hyperframes only, mp4 only (below) |

**The mp4 is always written.** qa (loudness), the manifest and `all` read the mp4 at `out`, so a non-mp4 format is an
extra file beside it: `out/film.webm`, `film.mov`, `film.gif`, `film.apng`, or the folder `out/film-png/`
(`frame_00001.png`, …). With `--formats`/`--lang`/`--style` the suffix follows the mp4 (`film-9x16.webm`). Subtitles
(.srt/.vtt) are written as before. With `alpha` the mp4 itself is flattened (no alpha in H.264).

## Alpha
The renderer injects `html, body, #stage { background: transparent }` after the page loads and takes PNG screenshots
with a transparent background (pvk: `omitBackground`; hyperframes: the style is stamped into `hf/index.html` for the
render and restored after). **The film must not paint its own backdrop**: anything you paint stays opaque, so skip
`KIT.stage` fills, full-bleed images and gradients you do not want. pvk frames are `frames/f00000.png`, not `.jpg`
(the frame cache and `manifest.json` frame hashes only cover the jpg frames, so a verify of an alpha film checks inputs
and frame count only). Check with
`ffprobe` (webm stores alpha as a stream tag `alpha_mode=1`, pix_fmt reads `yuv420p`; decode with `-c:v libvpx-vp9` to get
`yuva420p`).

## HDR (`output.hdr`)
hyperframes renderer only; pvk exits with "HDR needs the hyperframes renderer". `frames` renders through the producer's
own mp4 path (`hdrMode: "force-hdr"`) into `frames/hdr.mp4`, `encode` muxes `mix.wav` in (video copied). Measured with
HyperFrames 0.9.19: the producer only produces HDR when the page contains HDR **sources** (a `<video>` or image that is
PQ/HLG, detected by ffprobe). Then the output is HEVC Main 10, `bt2020nc`/`bt2020`, transfer `arib-std-b67` (HLG) or
`smpte2084` matching the source. A composition with no HDR source still logs "output: HLG" but the file is plain SDR
H.264 (`bt709`). HDR cannot be combined with alpha or another format.

## 4:5
`--formats 4x5` renders 1080×1350 (Instagram feed portrait), next to `16x9`, `9x16`, `1x1`. Films that lay out in the
title-safe box (`KIT.safe`, `KIT.u`) already adapt.
