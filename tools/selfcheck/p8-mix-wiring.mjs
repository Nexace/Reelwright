// node tools/selfcheck/p8-mix-wiring.mjs — docs/plans/p8-patches/mix.patch applied to a COPY of tools/mix.py: with no new keys the mix.wav is
// byte-identical to the unpatched script's (existing films keep their mix); with project.json "automation" the music follows its dB lane
// (a +12 dB lane lifts the second half; fades shape the ends); with "limiter" the true peak of a hot mix stays under the ceiling.
// Runs the real mix.py on a throwaway project with a synthetic bed, no voice. Offline.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PY = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p8-mix-"));
const sh = (cmd, args, o = {}) => { const r = spawnSync(cmd, args, { encoding: "utf8", ...o }); assert.equal(r.status, 0, `${cmd} ${args.join(" ")}\n${r.stderr}`); return r; };
try {
  const orig = path.join(tmp, "orig"), patched = path.join(tmp, "patched");
  for (const d of [orig, patched]) { fs.mkdirSync(path.join(d, "tools"), { recursive: true }); fs.copyFileSync(path.join(ROOT, "tools", "mix.py"), path.join(d, "tools", "mix.py")); }
  fs.copyFileSync(path.join(ROOT, "tools", "mixfx.py"), path.join(patched, "tools", "mixfx.py"));
  sh("patch", ["-p1", "-d", patched, "-i", path.join(ROOT, "docs", "plans", "p8-patches", "mix.patch")]);

  const proj = (name, extra) => {   // 6 s project: a loud 220 Hz + 3 kHz bed, no voice, one whoosh cue
    const d = path.join(tmp, name); fs.mkdirSync(path.join(d, "music"), { recursive: true });
    fs.writeFileSync(path.join(d, "project.json"), JSON.stringify({ loudness: -14, ...extra }));
    fs.writeFileSync(path.join(d, "timeline.json"), JSON.stringify({ DUR: 6, VO: {}, cues: [{ t: 3, kind: "whoosh", gain: 1 }] }));
    sh("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=f=220:d=6:sample_rate=48000", "-f", "lavfi", "-i", "sine=f=3000:d=6:sample_rate=48000", "-filter_complex", "[0][1]amix=inputs=2:normalize=0,volume=1.6[o]", "-map", "[o]", "-ac", "2", path.join(d, "music", "bed.wav")]);
    return d;
  };
  const mix = (script, d) => { sh(PY, [path.join(script, "tools", "mix.py"), d]); return path.join(d, "mix.wav"); };
  const rms = (f, ss, t) => { const r = sh("ffmpeg", ["-hide_banner", "-nostats", "-ss", String(ss), "-t", String(t), "-i", f, "-af", "volumedetect", "-f", "null", "-"]); return +/mean_volume: (-?[\d.]+)/.exec(r.stderr)[1]; };
  const tp = (f) => +/Peak:\s+(-?[\d.]+) dBFS/.exec(sh("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.split("True peak:")[1])[1];

  const a = fs.readFileSync(mix(orig, proj("a", {}))), b = fs.readFileSync(mix(patched, proj("b", {})));
  assert.ok(a.equals(b), "no new keys: the patched mix.wav is byte-identical");

  const lane = mix(patched, proj("c", { automation: { music: { gain: [[0, -12], [2.5, -12], [3.5, 0]], fade_out: 1 } } }));
  const early = rms(lane, 0.2, 1.5), late = rms(lane, 3.8, 1.5), tail = rms(lane, 5.7, 0.2);
  assert.ok(late - early > 8, `the dB lane lifts the second half (${early} -> ${late} dB)`);
  assert.ok(late - tail > 6, `the fade-out shapes the end (${late} -> ${tail} dB)`);

  const lim = mix(patched, proj("d", { loudness: -6, limiter: { ceiling_db: -6 } }));
  const tpl = tp(lim), tp0 = tp(mix(patched, proj("e", { loudness: -6 })));
  console.log(`  true peak without limiter ${tp0} dBFS, with ${tpl} dBFS`);
  assert.ok(tpl <= -5.7 && tp0 > -3, `limiter ceiling -6: true peak ${tpl} dBFS (${tp0} without)`);
  console.log(`p8-mix-wiring self-check: patch applies, default mix byte-identical, automation lane ${early} -> ${late} dB then fades to ${tail}, limited true peak ${tpl} dBFS`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
