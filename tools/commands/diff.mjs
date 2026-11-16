// diff <reference.mp4> <candidate.mp4> [--bar 0.9] [--fps 10] [--tol 0.15] [--threshold 0.3] [--json]
//                  how close is a render to a reference video (ffmpeg only, offline): SSIM per frame (candidate scaled to the
//                  reference's size; mean, worst frames), missed and extra cuts (matched within --tol s), and the audio offset
//                  in seconds. Exits 1 when the mean SSIM is under --bar, so it can gate a build. `stills --against` can reuse it.
import { probe, ssim, cuts, matchCuts, audioOffset } from "../videotools.mjs";

export default async ({ args }) => {
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? +args.splice(i, 2)[1] : d; };
  const json = args.includes("--json") && !!args.splice(args.indexOf("--json"), 1);
  const bar = opt("--bar", 0.9), fps = opt("--fps", 10), tol = opt("--tol", 0.15), thr = opt("--threshold", 0.3);
  const [ref, test] = args;
  if (!ref || !test) { console.log("usage: reelwright diff <reference.mp4> <candidate.mp4> [--bar 0.9] [--fps 10] [--tol 0.15] [--json]"); process.exit(1); }
  try {
    const dr = probe(ref).duration, dt = probe(test).duration;
    const s = ssim(ref, test, fps), c = matchCuts(cuts(ref, thr), cuts(test, thr), tol), off = audioOffset(ref, test);
    const worst = [...s.frames].sort((a, b) => a.ssim - b.ssim).slice(0, 5).sort((a, b) => a.t - b.t);
    const r = { ssimMean: s.mean, ssimMin: s.min, bar, pass: s.mean >= bar, worst, durations: { reference: dr, candidate: dt }, missedCuts: c.missed, extraCuts: c.extra, audioOffset: off };
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`SSIM  mean ${s.mean.toFixed(4)}  min ${s.min.toFixed(4)}  (${s.frames.length} frames at ${fps} fps; bar ${bar}) ${r.pass ? "PASS" : "FAIL"}`);
      console.log(`worst ${worst.map((w) => `${w.t.toFixed(1)}s=${w.ssim.toFixed(3)}`).join("  ")}`);
      console.log(`cuts  missed ${c.missed.map((t) => t.toFixed(2)).join(", ") || "none"}   extra ${c.extra.map((t) => t.toFixed(2)).join(", ") || "none"}`);
      console.log(`audio offset ${off === null ? "n/a (no audio to compare)" : off + " s"}   duration ${dr.toFixed(2)} vs ${dt.toFixed(2)} s`);
    }
    if (!r.pass) process.exit(1);
  } catch (e) { console.log(`diff: ${e.message}`); process.exit(1); }
};
