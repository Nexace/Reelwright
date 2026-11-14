// audio-report <file> [--at T] [--range A B] [--place-at T] [--json]   onsets, loudness sections and rhythm (tempo, steadiness) of any audio
//                        or video file; --at/--place-at name the onset and beat nearest a time (tools/audio_report.py)
import path from "node:path";

export default async function audio({ args, ROOT, PY }) {
  const { spawnSync } = await import("node:child_process");
  if (!args[0]) { console.log("usage: reelwright audio-report <file> [--at T] [--range A B] [--place-at T] [--json]"); process.exit(1); }
  const r = spawnSync(PY, [path.join(ROOT, "tools", "audio_report.py"), ...args], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}
