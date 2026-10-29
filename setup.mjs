#!/usr/bin/env node
// One-time setup on macOS (Homebrew), Windows (winget, else Chocolatey) or Debian/Ubuntu (apt). Safe to re-run.
// Installs ffmpeg and Python if missing, the Python libs (edge-tts, numpy, pillow), Playwright + its Chromium,
// then checks everything works. Needs Node itself first (./setup.sh installs it on macOS/Linux).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(path.dirname(fileURLToPath(import.meta.url)));
const WIN = process.platform === "win32", MAC = process.platform === "darwin";
const ok = (s) => console.log(`  \x1b[32m✔\x1b[0m ${s}`);
const bad = (s) => console.log(`  \x1b[31m✘\x1b[0m ${s}`);
// shell on Windows so npm/npx/winget .cmd shims resolve
const sh = (bin, args, opt = {}) => spawnSync(bin, args, { stdio: "inherit", shell: WIN, ...opt });
const out = (bin, args) => { const r = spawnSync(bin, args, { encoding: "utf8", shell: WIN }); return r.status === 0 ? r.stdout.trim() : null; };
const has = (bin) => out(bin, ["--version"]) !== null || out(bin, ["-version"]) !== null;
const PY = process.env.PYTHON || (WIN ? "python" : "python3");

const pkgs = { // name → [binary, brew, winget id, choco, apt]
  ffmpeg: ["ffmpeg", "ffmpeg", "Gyan.FFmpeg", "ffmpeg", "ffmpeg"],
  python: [PY, "python", "Python.Python.3.12", "python", "python3 python3-pip"],
};
for (const [name, [bin, brew, winget, choco, apt]] of Object.entries(pkgs)) {
  if (has(bin)) { ok(name); continue; }
  console.log(`installing ${name}…`);
  if (MAC) {
    if (!has("brew")) {
      console.log("Homebrew is missing. Install it first (paste in Terminal, then re-run ./setup.sh):");
      console.log('  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
      process.exit(1);
    }
    sh("brew", ["install", brew]);
  } else if (WIN) {
    if (has("winget")) sh("winget", ["install", "-e", "--id", winget, "--accept-package-agreements", "--accept-source-agreements"]);
    else if (has("choco")) sh("choco", ["install", "-y", choco]);
    else { console.log(`Install ${name} (winget install ${winget}, or choco install ${choco}), then re-run node setup.mjs`); process.exit(1); }
    console.log(`(open a new terminal if ${bin} is still not found — PATH updates need one)`);
  } else if (has("apt-get")) {
    sh("sudo", ["apt-get", "update", "-q"]); sh("sudo", ["apt-get", "install", "-yq", ...apt.split(" ")]);
  } else console.log(`Install ${name} with your package manager, then re-run node setup.mjs`);
}

console.log("Python libraries…");
const pip = (...extra) => sh(PY, ["-m", "pip", "install", "--user", "-q", "-r", "requirements.txt", ...extra], { stdio: "ignore" }).status === 0;
pip() || pip("--break-system-packages");

console.log("Playwright…");
has("bun") ? sh("bun", ["install", "--silent"]) : sh("npm", ["install", "--silent"]);
if (sh("npx", ["--yes", "playwright", "install", ...(process.platform === "linux" ? ["--with-deps"] : []), "chromium"]).status !== 0)
  console.log("(Chromium download failed — the kit falls back to your Google Chrome)");

console.log("\nChecks:");
const ff = out("ffmpeg", ["-version"]);
ff ? ok(`ffmpeg ${ff.split(" ")[2]}`) : bad("ffmpeg");
ok(`node ${process.version}`);
sh(PY, ["-c", "import edge_tts, numpy, PIL"], { stdio: "ignore" }).status === 0
  ? ok("python libs (edge-tts, numpy, pillow)") : bad(`python libs — run: ${PY} -m pip install --user -r requirements.txt`);
try { const b = await (await import("./tools/browser.mjs")).launch(); await b.close(); ok("headless browser"); }
catch (e) { bad("browser: " + e.message.split("\n")[0]); process.exit(1); }
console.log(`\nReady. Make the example film:  ${WIN ? "node bin/reelwright.mjs all" : "./video.sh all"}`);
