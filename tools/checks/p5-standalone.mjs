// standalone(projectDir, check, name): run one tools/checks/p5-*.page.mjs on a built project outside `qa` and print its lines (exit 0).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";

export async function standalone(dir, check, name) {
  if (!dir) { console.error(`usage: node tools/checks/${name}.page.mjs <project>`); process.exit(2); }
  const DIR = path.resolve(dir), P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
  const file = path.join(DIR, P.renderer === "hyperframes" ? "hf/index.html" : "film/index.html");
  if (!fs.existsSync(file)) { console.error(`${name}: no film page ${file} (build the project first)`); process.exit(1); }
  const W = P.width || 1920, H = P.height || 1080, b = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  try {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    await p.goto(pathToFileURL(file).href);
    if (!(await p.evaluate(() => window.READY).catch(() => false))) { console.error(`${file} failed to load`); process.exit(1); }
    const lines = await check(p, { DIR, P, W, H });
    console.log(lines.length ? lines.join("\n") : `${name}: no problems`);
  } finally { await b.close(); }
}
