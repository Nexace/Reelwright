// reverse <video> [--out <dir>] [--threshold 0.3]   take an existing video apart into a shot list to rebuild it from (offline, no model):
//                  <dir>/shots.json (probe, every shot's start/end/duration, its middle frame) and a shot-NN.jpg still per shot.
//                  This is the measurable half of HyperFrames `reverse`: looking at the stills and writing the film is yours
//                  (or the agent's); then compare the rebuild with `diff`. Default <dir>: <video>-reverse/
import fs from "node:fs";
import path from "node:path";
import { probe, cuts, frames } from "../videotools.mjs";

export default async ({ args }) => {
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
  const thr = +opt("--threshold", 0.3), outArg = opt("--out");
  const [file] = args;
  if (!file) { console.log("usage: reelwright reverse <video> [--out dir] [--threshold 0.3]"); process.exit(1); }
  try {
    const p = probe(file), out = path.resolve(outArg || file.replace(/\.[^./\\]+$/, "") + "-reverse");
    const edges = [0, ...cuts(file, thr), p.duration];
    const shots = edges.slice(0, -1).map((s, i) => ({ n: i + 1, start: +s.toFixed(3), end: +edges[i + 1].toFixed(3), duration: +(edges[i + 1] - s).toFixed(3) }));
    const fr = frames(file, shots.map((s) => (s.start + s.end) / 2), out, 960);
    shots.forEach((s, i) => { const to = path.join(out, `shot-${String(s.n).padStart(2, "0")}.jpg`); fs.renameSync(fr[i].file, to); s.frame = path.basename(to); });
    fs.writeFileSync(path.join(out, "shots.json"), JSON.stringify({ source: path.basename(file), probe: p, threshold: thr, shots }, null, 2) + "\n");
    console.log(`${shots.length} shots, ${p.duration.toFixed(1)} s → ${out}/shots.json`);
    for (const s of shots) console.log(`  ${String(s.n).padStart(2)}  ${s.start.toFixed(2)}–${s.end.toFixed(2)} s  ${s.frame}`);
  } catch (e) { console.log(`reverse: ${e.message}`); process.exit(1); }
};
