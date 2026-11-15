// beatsync [project] [--grid t0,beat] [--json]   beat-synced cutting, measured on the rendered mp4: kick / snare / hat hits from its audio,
//                  how many grid beats carry a hit and the source-music offset in ms, and every hard cut's error in frames against the
//                  beat grid and the nearest audible hit (WARN past 3 frames). Needs the rendered mp4 and ffmpeg. Offline. (tools/beatsync.py)
export default function ({ proj, args, PY, run }) {
  run(PY, "tools/beatsync.py", proj, ...args);
}
