// audiofx <in> <out> --preset <name> | --job <name> | --profile <name>=0..1 | --chain '<json>' | --fx "highpass:freq=120,reverb:decay=1.5"
//                  audio FX rack (tools/audio_fx.py, ffmpeg only, offline): 17 effects (highpass lowpass peaking lowshelf highshelf gain
//                  compressor limiter truepeak gate saturate bitcrush delay reverb chorus phaser pitchshift), 22 presets, 5 jobs,
//                  5 one-knob profiles. `audiofx --list` shows them all, `--print` shows the ffmpeg graph. In mix.py: project.json "fx".
//                  docs/playbook/audio-fx.md
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

export default async ({ args, PY, run }) => run(PY, path.join(ROOT, "tools", "audio_fx.py"), ...(args.length ? args : ["--list"]));
