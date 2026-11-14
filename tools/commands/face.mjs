// face <video> [--every s] [--json]   where the faces are in a video (HyperFrames `measure face`): one frame per --every seconds (default 1), a local
//                  detector (OpenCV Haar via tools/face_detect.py: `pip install opencv-python-headless`, nothing is downloaded by reelwright),
//                  then the share of time a face is present, the segments, the biggest face, centre, head room and moments outside the 5% safe margin.
import { measureFace } from "../measure_face.mjs";

export default async function face({ args }) {
  const i = args.indexOf("--every"), every = i >= 0 ? Number(args.splice(i, 2)[1]) : 1, j = args.indexOf("--json"), json = j >= 0 && args.splice(j, 1);
  const video = args[0];
  if (!video) { console.log("usage: reelwright face <video> [--every seconds] [--json]"); process.exit(1); }
  try {
    const r = measureFace(video, { every });
    if (json) return console.log(JSON.stringify(r, null, 1));
    const s = r.summary;
    console.log(`${video}: ${r.size.join("x")}, ${r.duration}s, ${r.samples.length} frames (every ${every}s)\n  face present ${Math.round(s.present * 100)}% of frames; segments ${s.segments.map((x) => x.join("-")).join(", ") || "none"}`);
    if (s.biggest) console.log(`  biggest face ${Math.round(s.biggest.heightShare * 100)}% of frame height at ${s.biggest.t}s; centre ${s.centre.map((v) => Math.round(v * 100) + "%").join(", ")}; head room ${Math.round(s.headroom * 100)}%` +
      (s.outsideSafe.length ? `\n  face outside the 5% safe margin at ${s.outsideSafe.join(", ")}s` : ""));
  } catch (e) { console.log(e.message); process.exit(1); }
}
