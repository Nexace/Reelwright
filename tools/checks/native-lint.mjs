// tools/checks/native-lint.mjs — native versions of the upstream @hyperframes/lint rules that tools/checks/hf-lint.mjs skips
// (their premise is HyperFrames' declarative model), plus the `check` audits Reelwright lacked: coordinate drift and HDR.
// A helper, not a plug-in by itself: the qa plug-in is native-lint.page.mjs (opt-in) and the command is tools/commands/lint.mjs.
// Every line is `<code>: <message> (fix: <hint>)` like hf-lint, and every one is a WARN (info-level upstream rules too).
//
// Ported (code = the upstream rule id it answers, restated for Reelwright's model: hf/film.js + render(t)):
//   missing_timeline_registry               film.js never calls KIT.start (it registers window.__timelines.main)
//   root_composition_missing_duration_source  window.FILM.DUR is not a positive number after KIT.start
//   composition_file_too_large              hf/index.html or hf/film.js over 300 lines (upstream's own limit)
//   composition_heavy_overlay_count_high    25+ elements with filter:blur / radial-gradient / clip-path on stage at one time
//   duplicate_audio_track                   two KIT.audio calls with the same file overlapping in time
//   audio_file_without_element              an audio file in assets/ or hf/ that no film code or project.json mentions
//   imperative_media_control                film.js calls .play() / .pause() / sets .currentTime on media itself
//   multiple_caption_tracks                 more than one KIT.subs row on stage
//   hevc_preview_codec                      a KIT.video source is HEVC/H.265 (info: renders fine, may not play in a browser preview)
// New checks (no upstream rule id):
//   coordinate_drift                        an element's box at time t differs after seeking elsewhere and back: render(t) is not pure
//   hdr_check                               output.hdr set without an HDR source, an HDR source with output.hdr off, HDR + alpha, a written mp4 that is not HDR
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const AUDIO = /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i;
const HDR_TRANSFER = new Set(["smpte2084", "arib-std-b67"]);
const ln = (code, msg, fix) => `${code}: ${msg} (fix: ${fix})`.replace(/\s+/g, " ").slice(0, 200);
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };
const lines = (s) => s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "<style></style>").split("\n").length;
const probe = (file) => {   // → { codec, transfer } of the first video stream, or null (no ffprobe / unreadable)
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,color_transfer", "-of", "json", file], { encoding: "utf8" });
  try { const s = JSON.parse(r.stdout).streams[0]; return { codec: s.codec_name, transfer: s.color_transfer || "" }; } catch { return null; }
};
const walk = (d) => { try { return fs.readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.join(e.parentPath, e.name)); } catch { return []; } };

// ── static: the film's source files, no browser ────────────────────────────
export function staticChecks(DIR, P) {
  const out = [], hf = path.join(DIR, "hf");
  const files = [path.join(hf, "film.js"), ...walk(path.join(hf, "blocks")).filter((f) => /\.(js|html)$/.test(f))];
  const film = read(path.join(hf, "film.js")), all = files.map(read).join("\n");
  const code = all.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, "$1");   // comments don't count
  if (film && !/\bKIT\.start\s*\(/.test(code)) out.push(ln("missing_timeline_registry", "hf/film.js never calls KIT.start, so no timeline is registered and the film has no duration", "end film.js with KIT.start({ dur, render })"));
  for (const [f, src] of [["hf/index.html", read(path.join(hf, "index.html"))], ["hf/film.js", film]]) {
    const n = lines(src);
    if (n > 300) out.push(ln("composition_file_too_large", `${f} has ${n} lines (upstream warns above 300)`, "move scenes into hf/blocks/ or sub-compositions (KIT.mount) so each file stays reviewable"));
  }
  if (/(\b\w*(video|audio|media|vid|clip)\w*)\.(play|pause)\s*\(|\.currentTime\s*=(?!=)/i.test(code))
    out.push(ln("imperative_media_control", "film code calls .play() / .pause() or sets .currentTime itself; a render never plays", "use KIT.video(src, { start, dur }) / KIT.audio, which seek from render(t)"));
  const mentioned = all + read(path.join(DIR, "project.json"));
  const unused = ["assets", "hf", "clips"].flatMap((d) => walk(path.join(DIR, d))).filter((f) => AUDIO.test(f) && !mentioned.includes(path.basename(f)));
  if (unused.length) out.push(ln("audio_file_without_element", `audio file(s) nothing uses: ${unused.slice(0, 3).map((f) => path.relative(DIR, f)).join(", ")}`, "play it with KIT.audio(src, { start }) or delete it"));
  return out;
}

// ── page: needs the film page loaded (window.READY) and seekable with window.render(t) ──
export async function pageChecks(page, { DIR, P, hf = P.renderer === "hyperframes" }) {
  const out = [], base = path.join(DIR, hf ? "hf" : "film");
  const r = await page.evaluate(async () => {
    const K = window.KIT, M = window.KIT_MEDIA || {}, dur = window.FILM && window.FILM.DUR, res = { dur, heavy: 0, subs: 0, drift: [], media: { videos: M.videos || [], audio: M.audio || [] } };
    const stage = K.stage, ts = Array.from({ length: 8 }, (_, i) => +((i + 0.5) * (dur > 0 ? dur : 1) / 8).toFixed(3));
    const boxes = () => [...stage.querySelectorAll("*")].map((e) => { const b = e.getBoundingClientRect(), s = getComputedStyle(e);
      return { k: e.tagName + (e.id ? "#" + e.id : ""), v: s.display !== "none" && s.visibility !== "hidden", r: [b.left, b.top, b.width, b.height],
        heavy: s.display !== "none" && (/blur\(/.test(s.filter) || /radial-gradient\(/.test(s.backgroundImage) || (s.clipPath && s.clipPath !== "none")) }; });
    const same = [];
    for (const t of ts) {
      await window.render(t); const a = boxes();
      res.heavy = Math.max(res.heavy, a.filter((x) => x.heavy).length);
      res.subs = Math.max(res.subs, stage.querySelectorAll(".kit-subs").length);
      await window.render((t + dur / 2) % (dur || 1)); await window.render(t); const b = boxes();   // away and back
      if (a.length !== b.length) { res.drift.push(`${t}s ${a.length} elements, then ${b.length} after seeking away and back`); continue; }
      a.forEach((x, i) => { if (x.v && b[i].v && x.r.some((n, j) => Math.abs(n - b[i].r[j]) > 0.5)) same.push(`${t}s ${x.k} box ${x.r.map(Math.round)} → ${b[i].r.map(Math.round)}`); });
    }
    res.drift.push(...same);
    return res;
  }).catch((e) => ({ error: String(e.message || e) }));
  if (r.error) return [ln("native_lint_page", `page checks could not run: ${r.error.slice(0, 80)}`, "fix the page error first")];
  if (r.drift.length) out.push(ln("coordinate_drift", `${r.drift.length} box(es) differ after seeking away and back, e.g. ${r.drift[0]}`, "render(t) must be a pure function of t: no state kept between frames, no tween left half-way"));
  if (!hf) return out;
  if (!(r.dur > 0 && Number.isFinite(r.dur))) out.push(ln("root_composition_missing_duration_source", `window.FILM.DUR is ${r.dur}`, "pass a positive dur to KIT.start({ dur, render })"));
  if (r.heavy >= 25) out.push(ln("composition_heavy_overlay_count_high", `${r.heavy} elements with filter:blur, radial-gradient or clip-path are on stage at once (upstream warns at 25; the capture can go black)`, "remove unused overlays or set display:none on idle ones"));
  if (r.subs > 1) out.push(ln("multiple_caption_tracks", `${r.subs} caption rows on stage at once`, "one KIT.subs per film"));
  const tail = r.media.audio, spans = tail.map((a) => [a.src, a.start, a.start + (a.len ?? Infinity)]);
  for (let i = 0; i < spans.length; i++) for (let j = i + 1; j < spans.length; j++)
    if (spans[i][0] === spans[j][0] && spans[i][1] < spans[j][2] && spans[j][1] < spans[i][2]) {
      out.push(ln("duplicate_audio_track", `${spans[i][0]} plays twice at once (${spans[i][1]}s and ${spans[j][1]}s)`, "give the second KIT.audio a later start or an out")); break;
    }
  // video sources: HEVC (info) and HDR
  const srcs = [...new Set(r.media.videos.map((v) => v.src).filter((s) => s && !/^(https?:|data:)/.test(s)))];
  const info = srcs.map((s) => [s, probe(path.resolve(base, s.split(/[?#]/)[0]))]).filter(([, p]) => p);
  const hevc = info.filter(([, p]) => /^(hevc|h265)$/.test(p.codec)).map(([s]) => s);
  if (hevc.length) out.push(ln("hevc_preview_codec", `HEVC video source(s): ${hevc.slice(0, 3).join(", ")}. Renders correctly; a browser preview may not play them`, "transcode to H.264 for the preview only if it stays blank"));
  out.push(...hdrCheck(DIR, P, info.some(([, p]) => HDR_TRANSFER.has(p.transfer))));
  return out;
}

// output.hdr only makes an HDR file when the page holds an HDR source (docs/playbook/output-formats.md)
export function hdrCheck(DIR, P, hasHdrSource = false) {
  const o = P.output || {}, out = [], mp4 = path.join(DIR, P.out || "out/film.mp4");
  if (o.hdr) {
    if (P.renderer !== "hyperframes") out.push(ln("hdr_check", "output.hdr needs the hyperframes renderer", "set renderer to hyperframes or drop output.hdr"));
    if (o.alpha) out.push(ln("hdr_check", "output.hdr cannot be combined with output.alpha", "pick one"));
    if (o.format && o.format !== "mp4") out.push(ln("hdr_check", `output.hdr is mp4 only, output.format is ${o.format}`, "drop the format"));
    if (!hasHdrSource) out.push(ln("hdr_check", "output.hdr is on but no KIT.video source is PQ/HLG: the file will be plain SDR", "add an HDR clip or turn output.hdr off"));
    if (fs.existsSync(mp4)) { const p = probe(mp4); if (p && !HDR_TRANSFER.has(p.transfer)) out.push(ln("hdr_check", `${path.relative(DIR, mp4)} is ${p.transfer || "SDR"}, not PQ/HLG`, "re-run frames and encode after adding an HDR source")); }
  } else if (hasHdrSource) out.push(ln("hdr_check", "a KIT.video source is HDR but output.hdr is off: it is tone-mapped to SDR", "set output.hdr to keep HDR (hyperframes, mp4)"));
  return out;
}

// ── components: lint a catalog component (a fragment) by itself ──
// Host-only rules cannot hold for a fragment that is mounted into a film, so they are dropped here.
const HOST_ONLY = new Set(["root_missing_dimensions", "root_missing_composition_id", "root_composition_missing_html_wrapper", "missing_gsap_script"]);
export async function lintComponents(files, { SKIP = {}, DOWNGRADE = {} } = {}) {
  const { lintHyperframeHtml } = await import("../../vendor/hyperframes/lint/dist/index.js");
  const out = [];
  for (const f of files) {
    const r = await lintHyperframeHtml(read(f), { filePath: f });
    for (const x of r.findings) {
      if (HOST_ONLY.has(x.code) || Object.hasOwn(SKIP, x.code)) continue;
      out.push({ file: f, level: Object.hasOwn(DOWNGRADE, x.code) ? "warning" : x.severity, line: ln(x.code, x.message.split(". ")[0], x.fixHint || "see the rule") });
    }
  }
  return out;
}
