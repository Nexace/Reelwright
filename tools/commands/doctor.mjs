// doctor [--json]       what a film needs here: node, ffmpeg and its encoders (x264, aac, vp9, prores, gif), python and libs, headless browser,
//                        docker and GPU (optional), disk, cores and RAM, reelwright version. Exits 1 if a required check fails. Reads only.
import { doctor } from "../doctor.mjs";

export default async function cmd({ args, ROOT, PY }) {
  const r = await doctor(ROOT, PY), bad = r.filter((c) => !c.ok);
  if (args.includes("--json")) console.log(JSON.stringify({ ok: !bad.length, checks: r }));
  else {
    for (const c of r) console.log(`${c.ok ? "\x1b[32m✔\x1b[0m" : "\x1b[31m✘\x1b[0m"} ${c.name.padEnd(16)} ${c.detail}${c.fix ? `\n    fix: ${c.fix}` : ""}`);
    console.log(bad.length ? `\n${bad.length} problem${bad.length > 1 ? "s" : ""}` : "\nall good");
  }
  process.exit(bad.length ? 1 : 0);
}
