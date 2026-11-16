// doctor(ROOT) → [{ name, ok, detail, fix? }]: the environment a film needs. Pure reads (no installs, no network).
// Used by `reelwright doctor` (tools/commands/doctor.mjs); each check is also what `setup` makes work.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const run = (cmd, args) => { try { const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 15000 }); return r.error || r.status !== 0 ? null : (r.stdout || "") + (r.stderr || ""); } catch { return null; } };

export async function doctor(ROOT, PY = process.platform === "win32" ? "python" : "python3") {
  const out = [], add = (name, ok, detail, fix) => out.push({ name, ok: !!ok, detail, ...(fix && !ok ? { fix } : {}) });
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  add("reelwright", true, `version ${pkg.version}`);
  const nodeOk = +process.versions.node.split(".")[0] >= 18;
  add("node", nodeOk, process.version, "install Node 18 or newer");
  const ff = run("ffmpeg", ["-version"]);
  add("ffmpeg", ff, ff ? ff.split(" ")[2] : "not found", "node setup.mjs (or brew/winget/apt install ffmpeg)");
  if (ff) {
    const enc = run("ffmpeg", ["-hide_banner", "-encoders"]) || "", hw = run("ffmpeg", ["-hide_banner", "-hwaccels"]) || "";
    for (const [id, what] of [["libx264", "mp4 (H.264)"], ["aac", "mp4 audio"], ["libvpx-vp9", "webm"], ["prores_ks", "mov (ProRes)"], ["gif", "gif"]])
      add(`codec ${id}`, new RegExp(`\\s${id}\\s`).test(enc), what, "this ffmpeg build lacks the encoder: install a full build");
    add("ffmpeg hwaccels", true, hw.split("\n").slice(1).map((s) => s.trim()).filter(Boolean).join(", ") || "none");
  }
  const py = run(PY, ["--version"]);
  add("python", py, py ? py.trim() : "not found", `install Python 3 (${PY})`);
  if (py) {
    const libs = spawnSync(PY, ["-c", "import numpy, PIL; import edge_tts"], { encoding: "utf8" });
    add("python libs", libs.status === 0, "numpy, pillow, edge-tts", `${PY} -m pip install --user -r requirements.txt`);
  }
  try {
    const { chromium } = await import("playwright"), exe = chromium.executablePath();
    const have = fs.existsSync(exe);
    let launched = null;
    try { const b = await (await import("./browser.mjs")).launch(); launched = await b.version(); await b.close(); } catch (e) { launched = null; }
    add("browser", launched, launched ? `${launched}${have ? "" : " (system Chrome)"}` : "no Chromium or Chrome could start", "reelwright browser ensure --install");
  } catch (e) { add("browser", false, "playwright is not installed", "npm install"); }
  const docker = run("docker", ["--version"]);
  add("docker", true, docker ? docker.trim() : "not found (optional: only for sandboxed renders)");
  const gpu = process.platform === "darwin" ? run("system_profiler", ["SPDisplaysDataType"]) : process.platform === "linux" ? run("lspci", []) : null;
  const gpuName = gpu && (/Chipset Model:\s*(.+)/.exec(gpu)?.[1] || gpu.split("\n").find((l) => /VGA|3D|Display/.test(l)));
  add("gpu", true, gpuName ? gpuName.trim() : "not detected (optional: renders are CPU based)");
  const cache = path.join(ROOT, "projects");
  let writable = true; try { fs.accessSync(ROOT, fs.constants.W_OK); } catch { writable = false; }
  const free = (() => { try { const s = fs.statfsSync(ROOT); return s.bavail * s.bsize; } catch { return null; } })();
  add("disk", writable && (free == null || free > 2e9), `${free == null ? "?" : (free / 1e9).toFixed(1) + " GB free"}, ${cache} ${writable ? "writable" : "not writable"}`, "free some disk space: a film renders about 1 GB of frames");
  add("cpu/ram", true, `${os.cpus().length} cores, ${(os.totalmem() / 2 ** 30).toFixed(1)} GB RAM`);
  return out;
}
