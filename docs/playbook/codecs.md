# Codecs, frame ranges, audio clips, spectrum and props (Phase 11, P9)

Node commands and helpers (offline, ffmpeg only). Each command's first lines are its reference. Proof: `node tools/selfcheck/encode.mjs`, `hw-encode.mjs`, `capture-quality.mjs`, `silence.mjs`,
`media-ffmpeg.mjs`, `media-wiring.mjs`, `props.mjs`, and the browser part in `node tools/selfcheck/remotion-kit.mjs audio props`.

| Remotion | Reelwright |
|---|---|
| `--codec h264 h265 vp8 vp9 av1 prores gif mp3 aac wav`, `--prores-profile` | `reelwright transcode [video] --codec h265 …` (a finished film into another codec; `codecArgs()` in `tools/encode.mjs`). AV1 uses `libsvtav1` (or `libaom-av1` when that is what ffmpeg has). |
| `--crf --video-bitrate --max-rate --buffer-size --x264-preset --gop --pixel-format --color-space --jpeg-quality --scale` | the build flags (`--quality --crf --video-bitrate --max-bitrate --buffer-size --keyframe-interval --resolution --supersample`, tools/render_opts.mjs) plus, on `transcode`: `--preset --pix-fmt --color-space --color-primaries --color-trc --color-range --scale --gif-fps`; `--jpeg-quality` on `range --stills`. |
| `--hardware-acceleration auto\|on\|off` (hardware H.264 / H.265, 2.7.3) | `--hardware-acceleration auto\|on\|off` on any build command (`all`, `film`, `encode`, …) and on `transcode`, or `"output": { "hardware": "auto" }` in project.json (`tools/hw_encode.mjs`). Default `off`: the software encode, byte for byte. `auto` uses the first of VideoToolbox (macOS), NVENC, QSV, VAAPI (Windows: NVENC, QSV; Linux: NVENC, QSV, VAAPI) that is listed by `ffmpeg -encoders` and really encodes a 1-frame test, and falls back to software without a word; `on` does the same but stops with the reason each candidate was rejected. |
| `--metadata key=value` | `transcode --metadata title=… --metadata comment=…` (repeatable) |
| `--frames 0-9,100-,30`, `--every-nth-frame`, `--duration` | `reelwright range [video] --frames … --every-nth-frame N --duration S [--stills dir]` cuts the selection out of the finished film (so it serves both renderers); `--dry-run` lists the frames. Stills are named by the film's own frame number. |
| `<Audio>` volume curve, `playbackRate`, `toneFrequency`, `loop`, `loopVolumeCurveBehavior`, `audioStreamIndex`, `<Video>` HLS | `KIT.audio(src, { vol: [[t, v]…], rate, tone, loop, loopVolume, stream, dur })` and `KIT.video(src, { vol, tone, stream, loop, transparent })` once `docs/plans/p9-patches/media-wiring.patch` is applied; the same chain on one file: `reelwright audio-clip <src> <out.wav> --vol 0:0,1:1 --tone 1.2 --loop 3 --stream 1`. A local `.m3u8` works as `src`. |
| silence detection recipe (loudnorm `input_thresh`, `silencedetect`), `getSilentParts()` (2.4.9) | `reelwright silence <media> [--noise -40dB\|auto] [--min 0.5] [--merge 0.3] [--json]` lists the speech and silence segments (`tools/silence.mjs`: `detectSilence`); `--noise auto` measures loudnorm's `input_thresh` (clamped -60 to -25 dB) instead of a fixed level; `--merge S` absorbs a sound shorter than S seconds between two silences (a click, a breath). `--trim out.wav [--pad 0.05]` cuts a voice line's leading and trailing silence (`trimSilence`). |
| `<OffthreadVideo transparent>` | `KIT.video(src, { transparent: true })`: RGBA png frames from an alpha webm (vp9/vp8 alpha), ProRes 4444, apng or a png source (patch above). |
| `visualizeAudio`, `useAudioData`, `visualizeAudioWaveform`, `createSmoothSvgPath` | `reelwright spectrum [file]` writes `film/audio-bands.js` (FFT at build time, no numpy); the page uses `KIT.level(t)`, `KIT.spectrum(t, n)`, `KIT.waveform(t, n)`, `KIT.smoothPath(points)` (`tools/audio-viz.js`). |
| `--props file.json \| '{…}'`, Zod `schema` | `--props` / `--props-file` on any command (patch `props-flags.patch`; aliases of `--variables`), checked against `props.schema.json` when the project has one; `reelwright props <project> check\|merge\|schema`; the page reads `KIT.props()`. A CSV of rows: `batch <project> rows.csv`. |

## Capture and encode fidelity

The defaults are the fidelity path: every film gets these without an option (`node tools/selfcheck/capture-quality.mjs`).

| Step | What it is | Why |
|---|---|---|
| frames | pvk writes PNG (`frames/f%05d.png`); hyperframes already did | a JPEG q94 intermediate is 4:2:0 (its chroma is halved before x264 halves it again) and loses saturated text and coloured syntax. `stills/` stay jpeg — the contact sheet and `stills2 --against` read them |
| capture flags | `--font-render-hinting=none --force-color-profile=srgb` on pvk, the producer and the shader pass | one glyph rasteriser and one colour profile for normal frames and shader-transition frames, so a cut between them does not move text |
| CSS | `html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale }` (tools/kit.css) | light-on-dark text renders heavier than the design on macOS |
| x264 | `-preset slow -crf 16 -tune animation -x264-params aq-mode=3:aq-strength=1.0` (the film encode only; `transcode` of other footage keeps plain x264 and its own colour) | `-tune animation` protects flat colour blocks from being smeared; `aq-mode=3` (auto-variance with bias to dark) spends bits where a dark scene would otherwise be starved |
| keyframes | `-g N` only, never `-keyint_min N` | `-keyint_min` equal to `-g` forbids scene-cut keyframes: a cut between two GOPs waits for the interval |
| colour | `scale=out_color_matrix=bt709:out_range=tv` for the RGB → YUV conversion, then `-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv`, plus the same tags as a `setparams` filter | the frames are sRGB; the explicit scale makes the pixels BT.709 limited range on any ffmpeg (6.x would otherwise convert with BT.601: pure red comes out 81/90/240, not 63/102/240). Without the tags players guess. ffmpeg 7+ takes primaries/trc from the frame properties, so the filter is what makes the mp4 say bt709 and not `unknown` |
| dither | a fixed 128×128 tile (`tools/kit-dither.png`, black/white pixels at alpha 1-2/255 = ±1-2 LSB) painted by `html.kit-dither body::after`, a class the renderers add for an opaque film capture | 8-bit quantisation bands dark gradients, vignettes and fades; a static tile dithers them without adding runtime randomness (the same frame is the same pixels every run) |
| supersample | `--supersample N` or `output.supersample: N` (2-4, pvk) | captures at `deviceScaleFactor` N× and adds `scale=W:H:flags=lanczos` at encode: real SSAA, so glyph and shader edges are resolved at 2-4× then averaged down |
| master | `output.master: "prores"` → `<out>-master.mov`, `prores_ks -profile:v 4` (4444, 4:4:4) | a grading/archive master beside the delivery mp4, from the same frames. Newer ffmpeg builds write 4444 at 12-bit (`yuv444p12le`) from the same `-pix_fmt yuva444p10le`; the profile is the same |
| 10-bit H.264 | `output.bitDepth: 10` → `-pix_fmt yuv420p10le -profile:v high10` | opt-in only: High10 does not play in Safari, so it is never the default |

`output.dither: false` leaves the class off; alpha captures (`output.alpha`) never get it, because a transparent film must not paint noise — and neither do element cutouts (`KIT.fx` layers, capture-trio), which are inputs to a composite, not finished frames.
`--supersample` is pvk only: the hyperframes renderer renders to the producer's canvas presets, so its sharpness path is `--resolution 4k`.

### Not worth it

- **Two-pass x264.** The encode is single-pass CRF, which is what quality is measured in. Two-pass only pays when you must hit a bitrate (a platform cap or a fixed file size) — then `--video-bitrate` + `--max-bitrate` and a second pass is the tool, not the default.
- **yuv444p H.264 delivery.** Browsers and Safari do not decode 4:4:4 H.264; the mp4 stays 4:2:0 and the 4:4:4 copy belongs in the ProRes master.
- **Display-P3.** Chromium here composites sRGB and the kit's colours and the dither tile are sRGB: a P3 tag without a P3 render is a lie, and a P3 render needs a colour-managed pipeline the renderers do not have.
- **120 fps.** It doubles render time, frame files and the bitrate for motion the shutter already carries; 60 fps is what the platforms keep and re-time anyway.
- **`--resolution 4k` as a sharpness fix.** It renders the same layout at 4× the pixels (that is delivery size, and 4× the cost). For crisper edges at the size you already deliver, `--supersample` is the same layout with SSAA.

## Limits

- Hardware encode covers H.264 and H.265 only (no VP9, AV1 or ProRes) and 8-bit yuv420p: another `--pix-fmt` is refused by `on` and sent to software by `auto`. The quality maps from the crf (VideoToolbox `-q:v` = 100 - 2 crf, NVENC `-cq`, QSV `-global_quality`, VAAPI `-qp`) so the size and look are close to, not the same as, x264's; a `--video-bitrate` replaces the mapping. Proven on VideoToolbox (`node tools/selfcheck/hw-encode.mjs`); NVENC, QSV and VAAPI use their documented ffmpeg options behind the same probe but were not run on real hardware here. AMD AMF is not tried. VAAPI reads `/dev/dri/renderD128` or `REELWRIGHT_VAAPI_DEVICE`.
- `silence` is a level threshold, not speech recognition: music or room noise above the `--noise` level counts as sound.

- `transcode` and `range` work on the finished mp4. The hyperframes renderer always renders the whole film, so a frame range is applied after it.
- HDR stays what the hyperframes renderer does (`output.hdr`); Rspack, `--license-key` and `--is-production` have no meaning here.
- Pitch (`tone`) keeps the duration (asetrate + atempo); `rate` keeps the pitch unless `audio-clip --varispeed` asks for the varispeed (pitch moves with speed) result.
- The `vol` points are seconds from the clip's start, linear between them, held outside.
