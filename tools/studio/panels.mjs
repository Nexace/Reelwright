// The studio's right-panel tools, server side (H5): read-only GET routes and a few POST routes, added to tools/studio/server.mjs. Same trust boundary as
// there (127.0.0.1, Host check, POST needs the studio's Origin and application/json); nothing here runs a shell.
//   GET  /__history /__files /__file?path= /__fx /__catalog?q= /__assets /__lint /__transcript /__peaks
//   POST /__undo /__redo (every write the studio made to project.json, brand.json, transcript.json or a source file is on the history) /__render (queued by the
//        server) /__cancel /__add (a catalog component, by name) /__transcript /__source (ONLY with `studio --edit-source`: text files inside the project)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { catalog, search } from "../catalog.mjs";
import { loadVars } from "../commands/batch.mjs";
import { hfLint } from "../checks/hf-lint.mjs";
import { loadSchema } from "../commands/props.mjs";
import { validate } from "../p9-schema.mjs";
import { TRANSITIONS, IMAGE, CLIP } from "../slideshow.mjs";

export const FORMATS = ["16x9", "9x16", "1x1", "4x5", "16x10"], RESOLUTIONS = ["4k", "portrait-4k", "square-4k"], QUALITIES = ["draft", "looks", "standard", "high", "delivery"];
const SRC = /\.(js|mjs|html|css|json|md|txt|svg|csv)$/i, SKIP_DIR = /^(node_modules|frames|stills|out|vo|clips|\.cache)([-\w]*)$/, MAX_TEXT = 1 << 20;
// slideshow source folders: one level inside the project, a plain name, never the film's own or build folders
const SLIDE_FOLDER = /^[A-Za-z0-9_][\w .-]{0,60}$/, SLIDE_SKIP = /^(hf|film|out|frames|stills|vo|music|clips|slideshows|node_modules|rm)$/i;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// checks for the fields the panels write (called from server.mjs checkProject): fx (audio rack), limiter, motionBlur (blur tab), variables
export function checkPanelFields(P, fxNames) {   // fxNames: () => Set of the audio rack's preset and job names
  if ("fx" in P) {
    if (!isObj(P.fx)) return "project.json: fx must be an object { vo, music, sfx, lines }";
    for (const k of ["vo", "music", "sfx"]) if (k in P.fx) {
      const v = P.fx[k];
      if (!(typeof v === "string" ? !fxNames || fxNames().has(v) : Array.isArray(v) || isObj(v))) return `project.json: fx.${k} must be a preset or job name${fxNames ? " (see the audio rack)" : ""}, or an effect chain`;
    }
    if ("lines" in P.fx && !isObj(P.fx.lines)) return "project.json: fx.lines must be an object of line id: preset";
  }
  if ("limiter" in P && !(typeof P.limiter === "boolean" || isObj(P.limiter))) return "project.json: limiter must be true or an object of options";
  if ("motionBlur" in P) {
    const m = P.motionBlur;
    if (!(typeof m === "boolean" || isObj(m))) return "project.json: motionBlur must be true or { shutter, samples }";
    if (isObj(m) && (("shutter" in m && !(typeof m.shutter === "number" && m.shutter > 0 && m.shutter <= 360)) || ("samples" in m && !(Number.isInteger(m.samples) && m.samples >= 2 && m.samples <= 64))))
      return "project.json: motionBlur.shutter is 1-360 degrees, samples a whole number from 2 to 64";
  }
  if ("variables" in P) {
    if (!Array.isArray(P.variables)) return "project.json: variables must be an array of declarations";
    const bad = loadVars().checkDecls(P.variables).find((i) => i.level === "error");
    if (bad) return `project.json: variables: ${bad.message || bad.code}`;
  }
  return null;
}

export function panels({ ROOT, DIR, PY, reply, inside, posix, num, readProject, isHf, afterWrite, editSource }) {
  const undo = [], redo = [], put = (rel, text) => {   // atomic, like the project.json save
    const f = path.join(DIR, rel), tmp = path.join(path.dirname(f), `.${path.basename(f)}.${process.pid}.tmp`);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    try { fs.writeFileSync(tmp, text); fs.renameSync(tmp, f); } catch (e) { fs.rmSync(tmp, { force: true }); throw e; }
  };
  const read = (rel) => { try { return fs.readFileSync(path.join(DIR, rel), "utf8"); } catch { return null; } };
  const record = (rel, before) => { undo.push({ rel, text: before }); if (undo.length > 60) undo.shift(); redo.length = 0; };
  const write = (rel, text) => { record(rel, read(rel)); put(rel, text); afterWrite(rel); };   // a studio write: undoable
  const step = (from, to) => {
    const h = from.pop(); if (!h) return null;
    to.push({ rel: h.rel, text: read(h.rel) });
    if (h.text === null) fs.rmSync(path.join(DIR, h.rel), { force: true }); else put(h.rel, h.text);
    afterWrite(h.rel); return h.rel;
  };
  const clean = (rel) => typeof rel === "string" && rel && !rel.includes("\0") && inside(rel) && !posix(path.normalize(rel)).split("/").some((s) => s.startsWith(".") || s === ".." ) && !/^hf\/kit\//.test(posix(path.normalize(rel)));
  let fxCache = null;
  const fx = () => fxCache ||= (() => {
    const r = spawnSync(PY, [path.join(ROOT, "tools", "audio_fx.py"), "--list"], { encoding: "utf8" }), out = { presets: [], jobs: [], profiles: [] };
    for (const l of (r.stdout || "").split("\n")) { const m = /^(presets|jobs): (.*)$/.exec(l); if (m) out[m[1]] = m[2].split(",").map((s) => s.trim()).filter(Boolean); }
    return out;
  })();
  const walk = (dir, depth, out) => {
    for (const e of fs.readdirSync(path.join(DIR, dir), { withFileTypes: true })) {
      if (e.name.startsWith(".") || out.length >= 600) continue;
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) { if (depth < 4 && !SKIP_DIR.test(e.name) && !(rel === "hf/kit")) walk(rel, depth + 1, out); }
      else if (e.isFile()) out.push({ path: rel, size: fs.statSync(path.join(DIR, rel)).size });
    }
    return out;
  };
  const kind = (f) => (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(f) ? "image" : /\.(mp4|mov|webm|m4v)$/i.test(f) ? "video" : /\.(wav|mp3|m4a|ogg|flac)$/i.test(f) ? "audio" : /\.(woff2?|ttf|otf)$/i.test(f) ? "font" : "other");

  // ── the waveform of mix.wav as peaks (a few hundred bins), for the timeline's waveform lane and level meter ──
  function peaks(bins = 1200) {
    const f = path.join(DIR, "mix.wav");
    if (!fs.existsSync(f)) return null;
    const r = spawnSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", "4000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
    if (r.status !== 0) return null;
    const s = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1), per = Math.max(1, Math.ceil(s.length / bins)), out = [];
    for (let i = 0; i < s.length; i += per) { let m = 0, q = 0; const e = Math.min(s.length, i + per); for (let k = i; k < e; k++) { const v = Math.abs(s[k]) / 32768; if (v > m) m = v; q += v * v; } out.push([+m.toFixed(4), +Math.sqrt(q / (e - i)).toFixed(4)]); }
    return { dur: s.length / 4000, bins: out };
  }

  async function get(u, res) {
    const q = u.searchParams;
    switch (u.pathname) {
      case "/__history": reply(res, 200, { undo: undo.length, redo: redo.length, last: undo.at(-1)?.rel ?? null }); return true;
      case "/__peaks": reply(res, 200, { peaks: peaks() }); return true;
      case "/__fx": reply(res, 200, { ...fx(), limiter: true }); return true;
      case "/__files": reply(res, 200, { files: walk("", 0, []), editSource }); return true;
      case "/__file": {
        const rel = q.get("path");
        if (!clean(rel) || !SRC.test(rel) || !fs.existsSync(path.join(DIR, rel)) || fs.statSync(path.join(DIR, rel)).size > MAX_TEXT) return reply(res, 404, { error: "not a text file in this project" }), true;
        reply(res, 200, { path: rel, text: fs.readFileSync(path.join(DIR, rel), "utf8"), editable: editSource && !/^(project|brand)\.json$/.test(rel) }); return true;
      }
      case "/__catalog": {
        const items = search(catalog(ROOT), { q: q.get("q") || "", type: q.get("type") || undefined, supported: true });
        reply(res, 200, { total: items.length, items: items.slice(0, 80).map((i) => ({ name: i.name, type: i.type, title: i.title, description: i.description, tags: i.tags, duration: i.duration })) }); return true;
      }
      case "/__assets": {
        const project = walk("", 0, []).filter((f) => kind(f.path) !== "other" && /^(assets|media|hf\/media|hf\/assets|clips|music|fonts)\//.test(f.path)).map((f) => ({ ...f, kind: kind(f.path) }));
        const g = process.env.REELWRIGHT_MEDIA_DIR || path.join(os.homedir(), ".media");   // the override is for the self-check
        let global = null; try { global = fs.readdirSync(g, { withFileTypes: true }).filter((e) => e.isFile() && !e.name.startsWith(".") && kind(e.name) !== "other").slice(0, 200).map((e) => ({ name: e.name, kind: kind(e.name), size: fs.statSync(path.join(g, e.name)).size })); } catch { /* none */ }
        reply(res, 200, { project, global, globalDir: "~/.media" }); return true;
      }
      case "/__lint": {
        const P = readProject();
        if (!isHf(P)) return reply(res, 200, { gate: [], warn: [], note: "static HyperFrames lint applies to HyperFrames films; run Check for the layout audit" }), true;
        try { const r = await hfLint(DIR, P); reply(res, 200, { gate: r.gate, warn: r.warn }); } catch (e) { reply(res, 200, { gate: [], warn: [], note: `lint did not run: ${e.message}` }); }
        return true;
      }
      case "/__transcript": reply(res, 200, { text: read("transcript.json") }); return true;
      case "/__slideshow": {   // the project's own folders that hold images or clips, and the slideshows already built
        const folders = fs.readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory() && SLIDE_FOLDER.test(e.name) && !SLIDE_SKIP.test(e.name)).map((e) => {
          const f = fs.readdirSync(path.join(DIR, e.name)).filter((n) => !n.startsWith("."));
          return { name: e.name, images: f.filter((n) => IMAGE.test(n)).length, clips: f.filter((n) => CLIP.test(n)).length };
        }).filter((f) => f.images + f.clips > 0);
        let built = []; try { built = fs.readdirSync(path.join(DIR, "slideshows"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { /* none yet */ }
        const P = readProject();
        reply(res, 200, { folders, built, transitions: TRANSITIONS, size: `${P.width || 1920}x${P.height || 1080}` }); return true;
      }
      case "/__props": {   // the per-run props of the film: its schema (props.schema.json, or made from project.json "variables") and props.json
        let schema = null, error = null, props = {};
        try { schema = loadSchema(DIR); } catch (e) { error = `props.schema.json: ${e.message}`; }
        try { const t = read("props.json"); if (t) props = JSON.parse(t); } catch (e) { error = `props.json: ${e.message}`; }
        reply(res, 200, { schema, props, hasFile: read("props.json") !== null, error }); return true;
      }
    }
    return false;
  }

  // POST routes; `jobs` = { enqueue(render), cancel(id) } from server.mjs
  function post(pathname, b, res, jobs) {
    switch (pathname) {
      case "/__undo": case "/__redo": {
        if (jobs.busy()) return reply(res, 409, { error: "busy: a job is running" }), true;
        const rel = pathname === "/__undo" ? step(undo, redo) : step(redo, undo);
        reply(res, rel ? 200 : 409, rel ? { ok: true, file: rel } : { error: "nothing to " + pathname.slice(3) }); return true;
      }
      case "/__render": {
        const pick = (v, list, what) => { if (v == null || v === "") return null; if (!list.includes(v)) throw new Error(`${what} must be one of ${list.join(", ")}`); return v; };
        try {
          const o = { format: pick(b.format, FORMATS, "format"), resolution: pick(b.resolution, RESOLUTIONS, "resolution"), quality: pick(b.quality, QUALITIES, "quality") };
          if (b.fps != null && b.fps !== "" && !(Number.isInteger(b.fps) && b.fps >= 1 && b.fps <= 240)) throw new Error("fps must be a whole number from 1 to 240");
          if (b.props === true && read("props.json") === null) throw new Error("save props first: there is no props.json");
          const r = jobs.enqueue({ ...o, fps: b.fps || null, gpu: b.gpu === true, props: b.props === true });
          reply(res, 202, { ok: true, id: r.id });
        } catch (e) { reply(res, 400, { error: e.message }); }
        return true;
      }
      case "/__props": {   // props.json, checked against the schema (the same checks `--props` makes); the film page gets it as window.PROPS, `--props-file` renders it
        if (!isObj(b.props)) return reply(res, 400, { error: "props must be a JSON object" }), true;
        let schema = null; try { schema = loadSchema(DIR); } catch (e) { return reply(res, 400, { error: `props.schema.json: ${e.message}` }), true; }
        const bad = schema ? validate(schema, b.props) : [];
        if (bad.length) return reply(res, 400, { error: `${bad[0].path} ${bad[0].message}`, errors: bad }), true;
        if (jobs.busy()) return reply(res, 409, { error: "busy: a job is running" }), true;
        write("props.json", JSON.stringify(b.props, null, 2) + "\n"); reply(res, 200, { ok: true }); return true;
      }
      case "/__slideshow": {   // → slideshows/<name>/ inside the project: one of its folders of images and clips becomes a film
        const r2 = (v, lo, hi) => (num(v, lo, hi) ? +v.toFixed(2) : null);
        const seconds = r2(b.seconds, 0.5, 60), tdur = r2(b.tdur, 0, 5), tr = String(b.transition || "fade").split(",");
        if (typeof b.folder !== "string" || !SLIDE_FOLDER.test(b.folder) || SLIDE_SKIP.test(b.folder) || !inside(b.folder) || !fs.statSync(path.join(DIR, b.folder), { throwIfNoEntry: false })?.isDirectory())
          return reply(res, 400, { error: "folder: one folder of this project (a plain name, not a dot-folder or build output)" }), true;
        if (typeof b.name !== "string" || !/^[a-z0-9][a-z0-9-]{0,40}$/.test(b.name)) return reply(res, 400, { error: "name: lower-case letters, digits and dashes" }), true;
        if (seconds === null || tdur === null || tdur >= seconds) return reply(res, 400, { error: "seconds is 0.5 to 60, tdur 0 to 5 and shorter than seconds" }), true;
        if (tr.length > 8 || !tr.every((x) => TRANSITIONS.includes(x))) return reply(res, 400, { error: `transition: ${TRANSITIONS.join(", ")} (a comma list cycles)` }), true;
        const out = path.join(DIR, "slideshows", b.name);
        if (fs.existsSync(out)) return reply(res, 409, { error: `slideshows/${b.name} already exists` }), true;
        const P = readProject();
        jobs.job("slideshow", { src: path.join(DIR, b.folder), out, seconds, tdur, transition: tr.join(","), size: `${P.width || 1920}x${P.height || 1080}` })
          ? reply(res, 202, { ok: true, out: `slideshows/${b.name}` }) : reply(res, 409, { error: "busy: a job is running" });
        return true;
      }
      case "/__cancel": jobs.cancel(b.id) ? reply(res, 200, { ok: true }) : reply(res, 404, { error: "no such render" }); return true;
      case "/__add": {
        if (typeof b.name !== "string" || !/^[\w-]+$/.test(b.name) || !catalog(ROOT).some((i) => i.name === b.name && i.status === "supported")) return reply(res, 400, { error: "not a catalog component reelwright can run" }), true;
        jobs.job("add", b.name) ? reply(res, 202, { ok: true }) : reply(res, 409, { error: "busy: a job is running" }); return true;
      }
      case "/__transcript": {
        const w = b.words;
        if (!Array.isArray(w) || !w.length || w.length > 20000 || !w.every((x) => isObj(x) && typeof x.text === "string" && x.text.length < 200 && num(x.start, 0, 36000) && num(x.end, 0, 36000) && x.end >= x.start)) return reply(res, 400, { error: "words: a non-empty array of { text, start, end } with end >= start" }), true;
        if (jobs.busy()) return reply(res, 409, { error: "busy: a job is running" }), true;
        write("transcript.json", JSON.stringify(w.map((x) => ({ text: x.text, start: +x.start.toFixed(3), end: +x.end.toFixed(3) })), null, 1) + "\n"); reply(res, 200, { ok: true }); return true;
      }
      case "/__source": {
        if (!editSource) return reply(res, 403, { error: "source editing is off: start the studio with --edit-source" }), true;
        if (!clean(b.path) || !SRC.test(b.path) || /^(project|brand)\.json$/.test(b.path) || typeof b.text !== "string" || b.text.length > MAX_TEXT) return reply(res, 400, { error: "a text file inside the project (not project.json/brand.json, not a dot-folder, not hf/kit/)" }), true;
        if (jobs.busy()) return reply(res, 409, { error: "busy: a job is running" }), true;
        write(b.path, b.text); reply(res, 200, { ok: true }); return true;
      }
    }
    return false;
  }
  const POSTS = new Set(["/__slideshow", "/__props", "/__undo", "/__redo", "/__render", "/__cancel", "/__add", "/__transcript", "/__source"]);
  const propsScript = () => {   // <script> for the film page in the studio: window.PROPS from props.json (KIT.props() merges it over the declared defaults)
    try { const t = read("props.json"); if (t && isObj(JSON.parse(t))) return `<script>window.PROPS=${JSON.stringify(JSON.parse(t)).replace(/</g, "\\u003c")};</script>`; } catch { /* a bad file is shown in the Props tab */ }
    return "";
  };
  return { get, post, POSTS, record, propsScript, write, fxNames: () => { const f = fx(); return new Set([...f.presets, ...f.jobs]); } };
}
