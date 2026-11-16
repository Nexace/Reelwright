# Codecs, frame ranges, audio clips, spectrum and props (Phase 11, P9)

Node commands and helpers (offline, ffmpeg only). Each command's first lines are its reference. Proof: `node tools/selfcheck/encode.mjs`, `hw-encode.mjs`, `silence.mjs`,
`media-ffmpeg.mjs`, `media-wiring.mjs`, `props.mjs`, and the browser part in `node tools/selfcheck/remotion-kit.mjs audio props`.

| Remotion | Reelwright |
|---|---|
| `--codec h264 h265 vp8 vp9 av1 prores gif mp3 aac wav`, `--prores-profile` | `reelwright transcode [video] --codec h265 …` (a finished film into another codec; `codecArgs()` in `tools/encode.mjs`). AV1 uses `libsvtav1` (or `libaom-av1` when that is what ffmpeg has). |
| `--crf --video-bitrate --max-rate --buffer-size --x264-preset --gop --pixel-format --color-space --jpeg-quality --scale` | the build flags (`--quality --crf --video-bitrate --max-bitrate --buffer-size --keyframe-interval --resolution`, tools/render_opts.mjs) plus, on `transcode`: `--preset --pix-fmt --color-space --color-primaries --color-trc --color-range --scale --gif-fps`; `--jpeg-quality` on `range --stills`. |
| `--hardware-acceleration auto\|on\|off` (hardware H.264 / H.265, 2.7.3) | `--hardware-acceleration auto\|on\|off` on any build command (`all`, `film`, `encode`, …) and on `transcode`, or `"output": { "hardware": "auto" }` in project.json (`tools/hw_encode.mjs`). Default `off`: the software encode, byte for byte. `auto` uses the first of VideoToolbox (macOS), NVENC, QSV, VAAPI (Windows: NVENC, QSV; Linux: NVENC, QSV, VAAPI) that is listed by `ffmpeg -encoders` and really encodes a 1-frame test, and falls back to software without a word; `on` does the same but stops with the reason each candidate was rejected. |
| `--metadata key=value` | `transcode --metadata title=… --metadata comment=…` (repeatable) |
| `--frames 0-9,100-,30`, `--every-nth-frame`, `--duration` | `reelwright range [video] --frames … --every-nth-frame N --duration S [--stills dir]` cuts the selection out of the finished film (so it serves both renderers); `--dry-run` lists the frames. Stills are named by the film's own frame number. |
| `<Audio>` volume curve, `playbackRate`, `toneFrequency`, `loop`, `loopVolumeCurveBehavior`, `audioStreamIndex`, `<Video>` HLS | `KIT.audio(src, { vol: [[t, v]…], rate, tone, loop, loopVolume, stream, dur })` and `KIT.video(src, { vol, tone, stream, loop, transparent })` once `docs/plans/p9-patches/media-wiring.patch` is applied; the same chain on one file: `reelwright audio-clip <src> <out.wav> --vol 0:0,1:1 --tone 1.2 --loop 3 --stream 1`. A local `.m3u8` works as `src`. |
| silence detection recipe (loudnorm `input_thresh`, `silencedetect`), `getSilentParts()` (2.4.9) | `reelwright silence <media> [--noise -40dB\|auto] [--min 0.5] [--merge 0.3] [--json]` lists the speech and silence segments (`tools/silence.mjs`: `detectSilence`); `--noise auto` measures loudnorm's `input_thresh` (clamped -60 to -25 dB) instead of a fixed level; `--merge S` absorbs a sound shorter than S seconds between two silences (a click, a breath). `--trim out.wav [--pad 0.05]` cuts a voice line's leading and trailing silence (`trimSilence`). |
| `<OffthreadVideo transparent>` | `KIT.video(src, { transparent: true })`: RGBA png frames from an alpha webm (vp9/vp8 alpha), ProRes 4444, apng or a png source (patch above). |
| `visualizeAudio`, `useAudioData`, `visualizeAudioWaveform`, `createSmoothSvgPath` | `reelwright spectrum [file]` writes `film/audio-bands.js` (FFT at build time, no numpy); the page uses `KIT.level(t)`, `KIT.spectrum(t, n)`, `KIT.waveform(t, n)`, `KIT.smoothPath(points)` (`tools/audio-viz.js`). |
| `--props file.json \| '{…}'`, Zod `schema` | `--props` / `--props-file` on any command (patch `props-flags.patch`; aliases of `--variables`), checked against `props.schema.json` when the project has one; `reelwright props <project> check\|merge\|schema`; the page reads `KIT.props()`. A CSV of rows: `batch <project> rows.csv`. |

## Limits

- Hardware encode covers H.264 and H.265 only (no VP9, AV1 or ProRes) and 8-bit yuv420p: another `--pix-fmt` is refused by `on` and sent to software by `auto`. The quality maps from the crf (VideoToolbox `-q:v` = 100 - 2 crf, NVENC `-cq`, QSV `-global_quality`, VAAPI `-qp`) so the size and look are close to, not the same as, x264's; a `--video-bitrate` replaces the mapping. Proven on VideoToolbox (`node tools/selfcheck/hw-encode.mjs`); NVENC, QSV and VAAPI use their documented ffmpeg options behind the same probe but were not run on real hardware here. AMD AMF is not tried. VAAPI reads `/dev/dri/renderD128` or `REELWRIGHT_VAAPI_DEVICE`.
- `silence` is a level threshold, not speech recognition: music or room noise above the `--noise` level counts as sound.

- `transcode` and `range` work on the finished mp4. The hyperframes renderer always renders the whole film, so a frame range is applied after it.
- HDR stays what the hyperframes renderer does (`output.hdr`); Rspack, `--license-key` and `--is-production` have no meaning here.
- Pitch (`tone`) keeps the duration (asetrate + atempo); `rate` keeps the pitch unless `audio-clip --varispeed` asks for the varispeed (pitch moves with speed) result.
- The `vol` points are seconds from the clip's start, linear between them, held outside.
