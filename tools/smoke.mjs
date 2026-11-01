// node tools/smoke.mjs — can this machine render? One frame from Playwright's Chromium and one from the vendored
// HyperFrames producer, in seconds, so a missing browser or system library fails before a long build.
// cloud/reelwright_colab.ipynb runs it first; also handy after setup on a new machine.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { launch } from "./browser.mjs";
import { headlessShell } from "./renderers/hyperframes.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-smoke-"));
const fail = (what, e) => { console.error(`✘ ${what}: ${e.message || e}`); process.exit(1); };
try {
  const browser = await launch();
  const p = await browser.newPage({ viewport: { width: 320, height: 180 } });
  await p.setContent('<body style="margin:0;background:#2fd08a">ok</body>');
  const png = await p.screenshot();
  await browser.close();
  if (png.length < 100) throw new Error("empty screenshot");
  console.log("✔ playwright chromium");
} catch (e) { fail("playwright chromium (run: npx playwright install --with-deps chromium)", e); }

try {
  // the smallest composition HyperFrames renders: a root with a size and a seekable timeline
  fs.writeFileSync(path.join(tmp, "index.html"), `<!doctype html><html><body style="margin:0">
<div id="root" data-composition-id="main" data-width="320" data-height="180" style="width:320px;height:180px;background:#8b5cf6"></div>
<script>window.__timelines = { main: { duration: () => 0.2, time: () => 0, seek() {}, pause() {}, play() {} } };</script>
</body></html>`);
  Object.assign(process.env, { DO_NOT_TRACK: "1", HYPERFRAMES_NO_TELEMETRY: "1" });
  process.env.PRODUCER_BROWSER_GPU_MODE ||= "software";
  process.env.HYPERFRAMES_BROWSER_PATH ||= headlessShell();
  const { createRenderRequest, createRenderJob, renderConfigFromRequest, executeRenderJob, createConsoleLogger } =
    await import("@hyperframes/producer");
  const out = path.join(tmp, "out");
  const req = createRenderRequest({ projectDir: tmp, outputPath: out,
    options: { fps: { num: 10, den: 1 }, format: "png-sequence", quality: "high", workers: 1 } });
  const job = createRenderJob(renderConfigFromRequest(req, { logger: createConsoleLogger("warn") }));
  await executeRenderJob(job, tmp, out);
  const n = fs.existsSync(out) ? fs.readdirSync(out).filter((f) => f.endsWith(".png")).length : 0;
  if (job.status !== "complete" || !n) throw new Error(job.error || `status ${job.status}, ${n} frames`);
  console.log(`✔ hyperframes producer (${n} frames)`);
} catch (e) { fail("hyperframes producer", e); }
finally { fs.rmSync(tmp, { recursive: true, force: true }); }
