// browser path | ensure [--install] | clear [--yes]   the headless browser the kit renders with: `path` prints Playwright's Chromium (or says
//                        it falls back to Google Chrome); `ensure` launches it (--install downloads Chromium when neither works);
//                        `clear` lists the Playwright browser cache (--yes deletes it; `ensure --install` brings it back)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export default async function cmd({ args }) {
  const [sub, ...rest] = args;
  const { chromium } = await import("playwright");
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), process.platform === "darwin" ? "Library/Caches/ms-playwright" : process.platform === "win32" ? "AppData/Local/ms-playwright" : ".cache/ms-playwright");
  if (sub === "path") {
    const exe = chromium.executablePath();
    console.log(fs.existsSync(exe) ? exe : `${exe} (missing: the kit falls back to Google Chrome, or run: reelwright browser ensure --install)`);
  } else if (sub === "ensure") {
    const { launch } = await import("../browser.mjs");
    const go = async () => { const b = await launch(); const v = await b.version(); await b.close(); return v; };
    try { console.log(`browser ok: ${await go()}`); }
    catch (e) {
      if (!rest.includes("--install")) { console.log("no browser could start: run `reelwright browser ensure --install` (downloads Chromium, about 150 MB)"); process.exit(1); }
      const r = spawnSync("npx", ["--yes", "playwright", "install", "chromium"], { stdio: "inherit", shell: process.platform === "win32" });
      if (r.status) process.exit(r.status);
      console.log(`browser ok: ${await go()}`);
    }
  } else if (sub === "clear") {
    const dirs = fs.existsSync(cache) ? fs.readdirSync(cache) : [];
    console.log(dirs.length ? `${cache}:\n  ${dirs.join("\n  ")}` : `${cache} is empty or missing`);
    if (dirs.length && rest.includes("--yes")) { fs.rmSync(cache, { recursive: true, force: true }); console.log("deleted"); }
    else if (dirs.length) console.log("add --yes to delete (shared with other Playwright projects)");
  } else { console.log("usage: reelwright browser path | ensure [--install] | clear [--yes]"); process.exit(1); }
}
