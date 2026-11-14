# Audio FX rack (HyperFrames D1 + D2)

Per-clip audio effects built on ffmpeg filters only: no plug-in, no model, offline. The module is `tools/audio_fx.py`,
the command is `reelwright audiofx`, the self-check is `node tools/selfcheck/p7-audiofx.mjs`.

## The command
```
reelwright audiofx --list                                   # every effect, preset, job and profile
reelwright audiofx in.wav out.wav --preset voice-clean
reelwright audiofx in.wav out.wav --job narration
reelwright audiofx in.wav out.wav --profile space=0.6        # one knob, 0..1
reelwright audiofx in.wav out.wav --fx "highpass:freq=120,reverb:decay=1.5:mix=0.3"
reelwright audiofx in.wav out.wav --chain '[{"fx":"pitchshift","semitones":4}]'
reelwright audiofx --print --preset hall                    # show the ffmpeg filter graph, run nothing
```
Options combine: the chain is preset, then job, then profile, then `--chain`, then `--fx`. The result is 48 kHz; reverb and
delay leave their tail after the input's end (the file is that much longer).

## The 17 effects (the D1 row says 16 and names 17)
A chain item is `{"fx": name, ...params}` (`"type"` also works; `"bypass": true` skips it). Unknown names or parameters are
an error, not ignored.

| Effect | Parameters (defaults) | ffmpeg |
|---|---|---|
| highpass, lowpass | freq (80 / 12000 Hz), q (0.707) | `highpass`, `lowpass` |
| peaking | freq 1000, gain 0 dB, q 1 | `equalizer` |
| lowshelf, highshelf | freq (200 / 6000), gain 0 dB | `bass`, `treble` |
| gain | db 0 | `volume` |
| compressor | threshold -18 dB, ratio 3, attack 10 ms, release 120 ms, makeup 0 dB | `acompressor` |
| limiter | ceiling -1 dB, release 60 ms | `alimiter` |
| truepeak | ceiling -1 dB | `alimiter` on the 4x oversampled signal |
| gate | threshold -45 dB, ratio 4, attack 5, release 120, range -60 dB | `agate` |
| saturate | drive 9 dB, trim (default -drive/2) | `asoftclip=tanh` |
| bitcrush | bits 8, samples 1 | `aeval` quantiser (+ `acrusher` for sample hold) |
| delay | time 300 ms, feedback 0.4, mix 0.4, taps 4 | `aecho` |
| reverb | decay 1.2 s, mix 0.3, damping 6000 Hz, predelay 0 ms | convolution (`afir`) with a synthetic noise impulse response |
| chorus | rate 0.9 Hz, depth 0.4, delay 40 ms, mix 0.5 | `chorus` |
| phaser | rate 0.5 Hz, depth 1, mix 0.6 | `aphaser` |
| pitchshift | semitones 0 (within +-12) | `asetrate` + `aresample` + `atempo` (duration kept) |

Every chain ends in a `alimiter=limit=1`, so effects never write past full scale. Notes: ffmpeg's `acrusher` does not reduce
bits in ffmpeg 9, hence the `aeval` quantiser; pitch shifting is resample-and-stretch, not a phase vocoder (fine for effects
voices, audible on music: `rubberband` is not in the standard build).

## Presets, jobs, profiles (D2)
- **22 presets**: voice-clean, voice-broadcast, voice-warm, rumble-cut, room-gate, boom-tame, harsh-tame, telephone,
  radio-am, megaphone, lofi-tape, pa-system, intercom, doofus-worble, chipmunk, giant, monster, room-tight, room-natural,
  hall, slap-echo, dub-throw. Each is a chain in the `PRESETS` table of `tools/audio_fx.py`.
- **5 jobs** (what a track is for): dialogue-cleanup, narration, music-bed, sfx-punch, master-safe.
- **5 one-knob profiles**: warmth, clarity, tighten, space, grit, each `name=0..1`.
The preset chains, job names and profile curves are Reelwright's own (HyperFrames' tables were not available offline);
the names of the 22 presets follow the D2 row.

## In a film: project.json `fx`
```json
"fx": { "vo": "voice-clean", "lines": { "hook": "hall" }, "music": "music-bed", "sfx": [{"fx": "highpass", "freq": 60}] }
```
`mix.py` applies `fx.lines.<id>` to that voice line (tail kept), `fx.vo` to the whole voice bus (after the music duck, which
listens to the dry voice), `fx.music` to the bed and `fx.sfx` to the SFX bus, each a preset/job name, a chain list or
`{"preset": ..., "chain": [...]}`. Needs the `tools/mix.py` hook `tools/selfcheck/p7-mix-fx.patch` (the self-check applies it
to a copy until it is in `mix.py`). From Python: `audio_fx.process_f32(x, sr, spec, keep_length=True)`.

Not built: automation lanes and per-clip fades (D3), groups and buses (D5), a live preview of the chain.

# Video measure, diff, reverse (HyperFrames G9)
`reelwright measure <video> probe|cuts|frames` (ffprobe/ffmpeg; `--json`, `--threshold`, `--at`, `--count`, `--out`),
`reelwright diff <reference> <candidate> [--bar 0.9]` (SSIM per frame on a scaled copy, missed and extra cuts, audio
offset from the loudness envelopes, exit 1 under the bar), `reelwright reverse <video>` (shot list `shots.json` plus a
still per shot). Face detection and an AI rebuild of the film from the video are not included. Self-check:
`node tools/selfcheck/p7-video.mjs`.

# Caption lint (HyperFrames F2)
`tools/checks/caption-lint.page.mjs` is a WARN check in `reelwright qa`: it reads the rendered page for caption elements
(including the engine's own subtitles) and reports six rules: text overflow, relative position, scaled words outside the
safe area, text-shadow on a group of translucent words, a caption still visible when no voice line is on, and voice lines
without word times. The two caption-track rules and the Studio transcript rule of the upstream lint stay skipped (they are
about HyperFrames' declarative tracks and Studio). Off: `"qa": {"caption-lint": false}`. Self-check:
`node tools/selfcheck/p7-caption-lint.mjs`.
