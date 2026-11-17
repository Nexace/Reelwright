// silence <media> [--noise -40dB|auto] [--min 0.5] [--merge 0.3] [--trim out.wav [--pad 0.05]] [--json]   where an audio or video file is quiet and where it
//                  speaks (Remotion getSilentParts / the silence-detection recipe): ffmpeg silencedetect, `--noise auto` takes loudnorm's measured gate
//                  threshold instead of a fixed level; a sound shorter than --merge between two silences is absorbed. --trim writes the file with its
//                  leading and trailing silence cut off (--pad seconds of room kept), for a voice line. Offline (ffmpeg). docs/playbook/codecs.md
import path from "node:path";
import { detectSilence, trimSilence } from "../silence.mjs";

export default async ({ args }) => {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const flag = (k) => { const i = args.indexOf(k); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const json = flag("--json"), n = (v) => (v === undefined ? undefined : Number(v));
  const o = { noise: opt("--noise"), min: n(opt("--min")), merge: n(opt("--merge")) }, trim = opt("--trim"), pad = n(opt("--pad"));
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  const src = args[0];
  if (!src) { console.error("usage: reelwright silence <media> [--noise -40dB|auto] [--min 0.5] [--merge 0.3] [--trim out.wav [--pad 0.05]] [--json]"); process.exit(1); }
  try {
    const d = detectSilence(path.resolve(src), o), t = trim ? trimSilence(path.resolve(src), path.resolve(trim), { ...o, ...(pad !== undefined && { pad }) }) : null;
    if (json) return console.log(JSON.stringify({ ...d, ...(t && { trimmed: t }) }, null, 2));
    console.log(`${path.basename(src)}: ${d.duration} s, silence at or below ${d.noise} for ${d.min} s or more (merge ${d.merge} s)`);
    const row = (k, s) => console.log(`  ${k.padEnd(7)} ${s.start.toFixed(3).padStart(8)} - ${s.end.toFixed(3).padStart(8)}  (${s.duration.toFixed(3)} s)`);
    for (const s of d.speech) row("speech", s);
    for (const s of d.silences) row("silence", s);
    if (t) console.log(`→ ${t.out}  (kept ${t.start}-${t.end} s, cut ${t.removedStart} s from the start and ${t.removedEnd} s from the end)`);
  } catch (e) { console.error(e.message); process.exit(1); }
};
