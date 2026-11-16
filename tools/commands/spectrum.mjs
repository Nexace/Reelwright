// spectrum [file] [--out audio-bands.js] [--fps N] [--bins N]   per-frame spectrum, level and waveform of an audio or video file, FFT at build time
//                  (no numpy), written as `window.AUDIO_BANDS = {…}` for KIT.level(t) / KIT.spectrum(t, n) / KIT.waveform(t, n) (tools/audio-viz.js;
//                  Remotion visualizeAudio). file defaults to the project's mix.wav; --out defaults to <project>/film/audio-bands.js. --bins is a power of 2.
import fs from "node:fs";
import path from "node:path";
import { audioBands } from "../media-ffmpeg.mjs";

export default async ({ proj, args }) => {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const out = opt("--out"), bins = Number(opt("--bins") || 128), f = opt("--fps");
  const pj = path.join(proj, "project.json"), fps = Number(f || (fs.existsSync(pj) && JSON.parse(fs.readFileSync(pj, "utf8")).fps) || 30);
  const src = args[0] || path.join(proj, "mix.wav");
  if (!fs.existsSync(src)) { console.error(`spectrum: no ${src} (build the audio first, or pass a file)`); process.exit(1); }
  try {
    const d = audioBands(path.resolve(src), { fps, bins }), file = path.resolve(out || path.join(proj, fs.existsSync(path.join(proj, "film")) ? "film" : ".", "audio-bands.js"));
    fs.writeFileSync(file, `window.AUDIO_BANDS = ${JSON.stringify(d)};\n`);
    console.log(`${d.frames.length} frames × ${d.bins} bins at ${fps} fps → ${file}  (<script src="audio-bands.js"> before the film; KIT.spectrum(t, 32))`);
  } catch (e) { console.error(e.message); process.exit(1); }
};
