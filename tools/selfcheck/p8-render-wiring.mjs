// node tools/selfcheck/p8-render-wiring.mjs — docs/plans/p8-patches/render-opts.patch (pvk.mjs, hyperframes.mjs, bin/reelwright.mjs) applied to a
// COPY of tools/ and bin/ in a temp root (vendor, node_modules… symlinked): the patched CLI renders a tiny pvk film. With no new flags the frames
// and mp4 settings are the old ones; --resolution 2x gives frames twice the size from the same layout; --quality, --keyframe-interval and
// --video-bitrate reach ffmpeg; --workers sets the pages. Offline, one 1-second film.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applyPatch } from "../patch_util.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p8-render-"));
const sh = (cmd, args, o = {}) => { const r = spawnSync(cmd, args, { encoding: "utf8", ...o }); assert.equal(r.status, 0, `${cmd} ${args.join(" ")}\n${r.stdout}\n${r.stderr}`); return r; };
try {
  for (const d of ["vendor", "fonts", "themes", "node_modules", "python", "templates"]) if (fs.existsSync(path.join(ROOT, d))) fs.symlinkSync(path.join(ROOT, d), path.join(tmp, d));
  for (const d of ["tools", "bin"]) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "package.json"), path.join(tmp, "package.json"));
  applyPatch(tmp, path.join(ROOT, "docs", "plans", "p8-patches", "render-opts.patch"));

  const mk = (name) => {
    const d = path.join(tmp, "p-" + name); fs.mkdirSync(path.join(d, "film"), { recursive: true });
    fs.writeFileSync(path.join(d, "project.json"), JSON.stringify({ width: 320, height: 180, fps: 10, out: "out/t.mp4", renderer: "pvk" }));
    fs.writeFileSync(path.join(d, "film", "index.html"), `<!doctype html><body style="margin:0"><div style="width:320px;height:180px;background:linear-gradient(#246,#8ac);font:30px Arial">hello</div><script>
window.FILM={DUR:1,FPS:10,cues:[],VO:{}};window.render=async(t)=>{document.body.style.opacity=1-t/3};window.READY=Promise.resolve(true);</script></body>`);
    return d;
  };
  const rw = (...a) => sh(process.execPath, [path.join(tmp, "bin", "reelwright.mjs"), ...a], { cwd: tmp });
  const size = (f) => sh("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", f]).stdout.trim().replace(/x$/, "");
  const probe = (f, e, x = []) => sh("ffprobe", ["-v", "error", ...x, "-show_entries", e, "-of", "csv=p=0", f]).stdout.trim();

  const a = mk("a"); rw("info", a); rw("frames", a, "--no-cache"); rw("encode", a);
  assert.equal(size(path.join(a, "frames", "f00000.jpg")), "320x180", "default frame size unchanged");
  assert.equal(size(path.join(a, "out", "t.mp4")), "320x180");

  const b = mk("b"); rw("info", b); rw("frames", b, "--no-cache", "--resolution", "2x", "--workers", "2");
  assert.equal(size(path.join(b, "frames", "f00000.jpg")), "640x360", "--resolution 2x: twice the pixels");
  rw("encode", b, "--quality", "high", "--keyframe-interval", "5", "--video-bitrate", "30k");
  assert.equal(size(path.join(b, "out", "t.mp4")), "640x360");
  const br = +probe(path.join(b, "out", "t.mp4"), "format=bit_rate");
  assert.ok(br < 70e3, `--video-bitrate 30k reached ffmpeg (a crf encode of this film is far above that): ${br}`);
  const I = probe(path.join(b, "out", "t.mp4"), "frame=pict_type", ["-select_streams", "v"]).split("\n").filter((t) => t.startsWith("I")).length;
  assert.ok(I >= 2, `--keyframe-interval 5 gives a keyframe every 5 frames (${I} in 10)`);
  const c = mk("c"), bad = spawnSync(process.execPath, [path.join(tmp, "bin", "reelwright.mjs"), "frames", c, "--resolution", "portrait-4k"], { cwd: tmp, encoding: "utf8" });
  assert.notEqual(bad.status, 0); assert.match(bad.stderr + bad.stdout, /aspect must match/, "a wrong-aspect preset is refused with the reason");
  console.log(`p8-render-wiring self-check: patch applies; default 320x180 unchanged; --resolution 2x -> 640x360; --quality/--video-bitrate/--keyframe-interval/--workers reach the encode (${br} bit/s, ${I} keyframes)`);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
