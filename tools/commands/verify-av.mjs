// verify-av [project]   does the sound in the rendered mp4 land where mix.wav put it? Measures the AAC priming (1024 samples = 1.28 frames
//                  at 60 fps), the global offset of the mp4's audio against mix.wav (cross-correlation) and the lag around every SFX
//                  cue; WARN lines past 1 frame. Needs the rendered mp4, mix.wav and ffmpeg. Offline. (tools/verify_av.py)
export default function ({ proj, args, PY, run }) {
  run(PY, "tools/verify_av.py", proj, ...args);
}
