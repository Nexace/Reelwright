// Renderer side of tools/media.js (window.KIT_MEDIA): video frames for pvk pages and extra audio for encode.
// pagesMedia(DIR, page, FPS, pageDir, { frames }) — after READY: writes <project>/.cache/media-audio.json (or removes it
//   when the film has no KIT.audio / audio:true clips) and, with frames, extracts every KIT.video clip to
//   <project>/.cache/video/<key>/000001.jpg… at the film FPS and hands the folder to the page (KIT.__videoFrames).
// mediaMix(DIR) — encode: mix.wav + those clips → <project>/.cache/media-mix.wav, or null when there are none (encode
//   then reads mix.wav exactly as before).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const LIST = (DIR) => path.join(DIR, ".cache", "media-audio.json");
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) { console.error(`${cmd} failed: ${r.stderr || r.error}`); process.exit(r.status || 1); } return r.stdout; };
const fileOf = (pageDir, src, what) => {
  const f = path.resolve(pageDir, decodeURIComponent(src));
  if (!fs.existsSync(f)) { console.error(`${what}: no file ${f}`); process.exit(1); }
  return f;
};

export async function pagesMedia(DIR, page, FPS, pageDir, { frames = true } = {}) {
  const M = await page.evaluate(() => window.KIT_MEDIA || null);
  if (!M) return;
  const clips = (M.audio || []).map((a) => ({ ...a, file: fileOf(pageDir, a.src, a.video ? `KIT.video("${a.video}")` : "KIT.audio") }));
  const list = LIST(DIR);
  if (clips.length) {
    const dur = await page.evaluate(() => window.FILM.DUR);
    fs.mkdirSync(path.dirname(list), { recursive: true });
    fs.writeFileSync(list, JSON.stringify({ dur, clips }, null, 1));
  } else fs.rmSync(list, { force: true });
  if (!frames) return;
  for (const v of M.videos || []) {
    const src = fileOf(pageDir, v.src, `KIT.video("${v.id}")`), st = fs.statSync(src);
    const key = crypto.createHash("sha256").update(JSON.stringify([src, st.mtimeMs, st.size, FPS])).digest("hex").slice(0, 16);
    const dir = path.join(DIR, ".cache", "video", key), done = path.join(dir, "count");
    if (!fs.existsSync(done)) {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      console.log(`KIT.video("${v.id}"): extracting frames at ${FPS} fps → ${path.relative(DIR, dir)}`);
      // Ported from HyperFrames engine/dist/services/videoFrameExtractor.js videoFilterChain (Apache-2.0, Copyright HeyGen):
      // each slot takes the last source frame starting at or before its time
      run("ffmpeg", ["-y", "-v", "error", "-i", src, "-an", "-vf", `settb=intb/2,setpts=PTS-lte(TB\\,0.001),fps=${FPS}:start_time=0:round=up`,
        "-q:v", "2", path.join(dir, "%06d.jpg")]);
      fs.writeFileSync(done, String(fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).length));
    }
    const count = Number(fs.readFileSync(done, "utf8"));
    await page.evaluate(([id, url, n, fps]) => window.KIT.__videoFrames(id, url, n, fps), [v.id, pathToFileURL(dir).href, count, FPS]);
  }
}

// Ported from HyperFrames engine/dist/services/audioMixer.js buildAtempoFilter (Apache-2.0, Copyright HeyGen)
const atempo = (r) => {
  const st = [];
  while (r < 0.5 - 1e-9) { st.push(0.5); r /= 0.5; }
  while (r > 2 + 1e-9) { st.push(2); r /= 2; }
  if (Math.abs(r - 1) >= 1e-9) st.push(r);
  return st.map((s) => `atempo=${s}`);
};
const n6 = (x) => Number(x.toFixed(6));
const probe = (f) => Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim());

export function mediaMix(DIR) {
  const list = LIST(DIR);
  if (!fs.existsSync(list)) return null;
  const { dur, clips } = JSON.parse(fs.readFileSync(list, "utf8"));
  if (!clips.length) return null;
  const mix = path.join(DIR, "mix.wav"), has = fs.existsSync(mix), out = path.join(DIR, ".cache", "media-mix.wav");
  const fmt = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";
  const g = [], pads = has ? ["[m]"] : [];
  if (has) g.push(`[0:a]${fmt}[m]`);
  clips.forEach((c, i) => {
    const k = i + (has ? 1 : 0), end = c.out ?? probe(c.file), len = c.len ?? end - c.in;
    const tail = [`apad`, `atrim=duration=${n6(len)}`,
      ...(c.fadeIn > 0 ? [`afade=t=in:st=0:d=${n6(c.fadeIn)}`] : []),
      ...(c.fadeOut > 0 ? [`afade=t=out:st=${n6(Math.max(0, len - c.fadeOut))}:d=${n6(c.fadeOut)}`] : []),
      `volume=${c.gain}`, `adelay=${Math.round(c.start * 1000)}:all=1`, "asetpts=N/SR/TB"].join(",");
    if (c.slices) {   // Ported from HyperFrames audioMixer.js buildRampFilterComplex: constant-tempo slices, pitch kept
      g.push(`[${k}:a]${fmt},asplit=${c.slices.length}${c.slices.map((_, j) => `[c${i}s${j}]`).join("")}`);
      c.slices.forEach(([a, b], j) => g.push(`[c${i}s${j}]atrim=start=${n6(c.in + a)}:end=${n6(c.in + b)},asetpts=PTS-STARTPTS,` +
        [...atempo((b - a) / c.step), "apad", "asetpts=N/SR/TB", `atrim=duration=${n6(c.step)}`].join(",") + `[c${i}t${j}]`));
      g.push(`${c.slices.map((_, j) => `[c${i}t${j}]`).join("")}concat=n=${c.slices.length}:v=0:a=1,${tail}[c${i}]`);
    } else {
      g.push(`[${k}:a]${fmt},atrim=start=${n6(c.in)}:end=${n6(end)},asetpts=PTS-STARTPTS,${[...atempo(c.tempo || 1), tail].join(",")}[c${i}]`);
    }
    pads.push(`[c${i}]`);
  });
  // with mix.wav: its length; without: the film's
  g.push(`${pads.join("")}amix=inputs=${pads.length}:normalize=0:duration=${has ? "first" : "longest"}` +
    (has ? "" : `,apad=whole_dur=${dur},atrim=duration=${dur}`) + "[out]");
  run("ffmpeg", ["-y", "-v", "error", ...(has ? ["-i", mix] : []), ...clips.flatMap((c) => ["-i", c.file]),
    "-filter_complex", g.join(";"), "-map", "[out]", "-c:a", "pcm_f32le", out]);
  console.log(`audio: ${clips.length} KIT.audio/KIT.video clip${clips.length === 1 ? "" : "s"} mixed over ${has ? "mix.wav" : "silence"}`);
  return out;
}
