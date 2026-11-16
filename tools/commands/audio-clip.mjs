// audio-clip <src> <out.wav> [--trim A-B] [--dur S] [--delay S] [--vol t:v,t:v,…] [--rate R] [--tone F] [--varispeed] [--loop N|inf]
//                  [--loop-volume repeat|extend] [--stream I] [--fade-in S] [--fade-out S] [--gain G]   one audio clip the way KIT.audio mixes it (Remotion
//                  <Audio>): trim, delay, a volume curve, speed (pitch kept; --varispeed moves pitch too), pitch (--tone 0.01-2, duration kept),
//                  loop, audio stream index. src may be a local .m3u8 (HLS) or any audio / video file. Offline (ffmpeg); docs/playbook/codecs.md
import path from "node:path";
import { renderAudioClip } from "../media-ffmpeg.mjs";

export default async ({ args }) => {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const flag = (k) => { const i = args.indexOf(k); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const trim = opt("--trim"), vol = opt("--vol"), loop = opt("--loop"), n = (v) => (v === undefined ? undefined : Number(v));
  const varispeed = flag("--varispeed");
  const [src, out] = args;
  if (!src || !out) { console.log("usage: reelwright audio-clip <src> <out.wav> [--trim A-B] [--dur S] [--delay S] [--vol t:v,…] [--rate R] [--tone F] [--loop N|inf] [--loop-volume repeat|extend] [--stream I]"); process.exit(1); }
  const [a, b] = trim ? trim.split("-").map(Number) : [];
  const c = { in: a, out: b, len: n(opt("--dur")), start: n(opt("--delay")), tempo: n(opt("--rate")), tone: n(opt("--tone")), preservePitch: !varispeed,
    vol: vol && vol.split(",").map((p) => p.split(":").map(Number)), loop: loop === "inf" ? true : n(loop), loopVolume: opt("--loop-volume"),
    stream: n(opt("--stream")), fadeIn: n(opt("--fade-in")), fadeOut: n(opt("--fade-out")), gain: n(opt("--gain")) };
  try { const r = renderAudioClip(path.resolve(src), path.resolve(out), c); console.log(`${r.seconds.toFixed(3)} s → ${r.out}`); }
  catch (e) { console.error(e.message); process.exit(1); }
};
