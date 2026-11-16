// beatsync [project] [--grid t0,beat] [--json] [--write]   beat-synced cutting, measured on the rendered mp4: kick / snare / hat
//                  hits from its audio, how many grid beats carry a hit and the source-music offset in ms, and every hard cut's
//                  error in frames against the beat grid and the nearest audible hit (WARN past 3 frames). --write saves the
//                  onsets to music/onsets.json (sched bakes them; KIT.hit snaps to them). Needs the mp4 and ffmpeg. Offline.
//                  (tools/beatsync.py)
export default function ({ proj, args, PY, run }) {
  run(PY, "tools/beatsync.py", proj, ...args);
}
