// tools/checks/native-lint2.mjs — P15: native versions of 22 more of the upstream @hyperframes/lint rules that hf-lint.mjs skips,
// mapped onto what a Reelwright film has: hf/film.js + KIT.* calls, hf/blocks and hf/compositions, KIT_MEDIA, project.json lines,
// vo/lines.json, the fx buses, the Studio. Helper for native-lint.mjs (staticChecks / pageChecks call into it); every line is
// `<code>: <message> (fix: <hint>)` like hf-lint, every finding a WARN. The other 13 skipped rules have no Reelwright counterpart:
// the table with the reason for each is docs/playbook/qa-lint.md.
//
// project.json + vo/ (projectChecks; every renderer)
//   studio_missing_editable_id             a line with no usable id (the Studio edits a line by its id; it names files in vo/)
//   linked_clip_orphan                     a script line and its voiced clip (vo/lines.json) are the linked pair: one side is missing
//   linked_clips_out_of_sync               the line's text differs from the text it was voiced from
//   audio_group_no_members                 fx.<bus> that is not vo / music / sfx / lines, fx.lines.<id> naming no line: the chain is dropped
//   composition_exceeds_inspection_viewport_cap   width / height over 8192: --formats and the Studio's save refuse it
// film source (staticChecks2; hyperframes)
//   missing_data_no_timeline               an hf/blocks file with a data-composition-id and no timeline and no data-no-timeline
//   gsap_timeline_not_registered           gsap.timeline() that neither KIT.gsap nor window.__timelines ever sees: nothing seeks it
//   gsap_animates_clip_element             a GSAP tween of visibility / display / autoAlpha on a KIT.video element (the producer owns it)
//   media_runtime_src_mutation             .src = / setAttribute('src') on a KIT.video element
//   speed_ramp_on_non_media                `ramp` on KIT.audio (retime sound with rate); other keys KIT.video / KIT.audio ignore (media_option_ignored)
//   audio_volume_tween_overrides_gain      a tween or assignment on `volume`: the mp4's sound never reads the page element
//   root_path_missing_in_preview           url(/x), fetch('/x'), src="/x": the film is a file:// page, so "/" is the disk's root
//   caption_transcript_not_inline          a caption block that fetches the transcript: `captions` re-feeds only an inline word array
// the film page (pageChecks2; hyperframes)
//   media_missing_data_start / media_missing_id / nested_media_start_basis_ambiguous / video_nested_in_timed_element /
//   video_missing_muted / video_muted_with_declared_audio    the <video> / <audio> elements of the page
//   clip_ends_past_root_duration           a KIT.video / KIT.audio / voiceover line that ends after window.FILM.DUR
//   nested_clip_never_visible              a KIT.video parented in a KIT.mount host that is hidden for the clip's whole window
//   system_font_will_alias                 the first family of a text element is an OS-only font nothing in the page declares
import fs from "node:fs";
import path from "node:path";

// ≤ 200 characters: the message gives way, the fix stays
export const ln = (code, msg, fix) => {
  const tail = ` (fix: ${fix})`.replace(/\s+/g, " "), room = 200 - code.length - 2 - tail.length, m = msg.replace(/\s+/g, " ");
  return `${code}: ${m.length > room ? m.slice(0, Math.max(10, room - 1)) + "…" : m}${tail}`.slice(0, 200);
};
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };
const walk = (d) => { try { return fs.readdirSync(d, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.join(e.parentPath, e.name)); } catch { return []; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\/|(^|[^:"'`\\])\/\/.*$/gm, "$1");   // comments don't count
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const rel = (DIR, f) => path.relative(DIR, f).split(path.sep).join("/");

// ── a small call scanner: `name(` … balanced `)` with strings skipped ──
function argsAt(code, i) {
  let d = 1, q = null;
  for (let k = i; k < code.length; k++) {
    const c = code[k];
    if (q) { if (c === "\\") k++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") q = c;
    else if ("([{".includes(c)) d++;
    else if (")]}".includes(c) && --d === 0) return code.slice(i, k);
  }
  return code.slice(i);
}
export const calls = (code, re) => { const out = []; re = new RegExp(re.source, "g"); for (let m; (m = re.exec(code));) out.push({ at: m.index, match: m, args: argsAt(code, re.lastIndex) }); return out; };
function split(s) {   // the top-level comma-separated parts of an argument list
  const out = []; let d = 0, q = null, from = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === "\\") k++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") q = c;
    else if ("([{".includes(c)) d++;
    else if (")]}".includes(c)) d--;
    else if (c === "," && d === 0) { out.push(s.slice(from, k)); from = k + 1; }
  }
  out.push(s.slice(from)); return out.map((x) => x.trim()).filter(Boolean);
}
const keysOf = (obj) => split(obj.trim().replace(/^\{|\}$/g, "")).flatMap((p) => { const m = /^(?:(["'])(.+?)\1|([A-Za-z_$][\w$]*))\s*(?::|$)/.exec(p); return m ? [m[2] || m[3]] : []; });
const lastObj = (args) => { const p = split(args).at(-1); return p && p.startsWith("{") ? p : null; };

// The 13 skipped upstream rules whose premise Reelwright does not have (no native check answers them); the reason is the whole table
// in docs/playbook/qa-lint.md, and tools/selfcheck/p15-lint.mjs checks that these, the ports and SKIP in hf-lint.mjs partition exactly.
export const NO_COUNTERPART = {
  root_composition_duration_derived: "a film's duration is always KIT.start's explicit dur (root_composition_missing_duration_source checks it); nothing is inferred from clips",
  timed_element_missing_clip_class: "class=\"clip\" is a HyperFrames Studio convention; the only data-start element Reelwright makes is KIT.video's <video>, which upstream exempts",
  timeline_element_missing_timing: "KIT.mount, KIT.video and KIT.seq throw at load without start and dur, so the page fails and qa stops; no element can sit untimed",
  nested_structure_needs_subcomposition: "there is no timeline row per element: render(t) draws everything, so nesting a timed element in another has no meaning",
  timeline_track_too_dense: "there are no timeline tracks; file size is composition_file_too_large",
  caption_track_kind_missing: "captions are drawn by KIT.subs or a caption block fed by `captions`, never a timeline track that needs a data-track-kind",
  gsap_timeline_registered_before_async_build: "KIT.gsap builds after fonts load and registers once; KIT.mount keeps the registered timeline object, so tweens added later still play",
  audio_volume_double_automation: "a vol curve, fades and gain multiply in one ffmpeg chain (tools/p9-media.mjs audioChain); no control overrides another",
  audio_carve_ungrouped_sources: "there is no carve: music ducks under the voiceover automatically (mix.py), and KIT.audio is never ducked",
  audio_group_timing_attrs: "buses are project.json keys (fx.vo, fx.music, fx.sfx), not elements, so they have no timing attributes",
  audio_group_holds_elements: "buses are project.json keys, not HTML elements that can hold other elements",
  audio_group_carve_attr: "there is no carve (see audio_carve_ungrouped_sources)",
  audio_reactive_single_tween_per_group: "audio-reactive data (tools/p9-audio.js) is read inside render(t) every frame, so one tween per caption group cannot be written; no catalog component has it",
};

// KIT.video / KIT.audio take one options object and ignore any other key (tools/media.js destructures it)
const VIDEO_KEYS = new Set(["id", "start", "dur", "in", "rate", "ramp", "volume", "audio", "transparent", "loop", "vol", "tone", "stream", "parent", "cls"]);
const AUDIO_KEYS = new Set(["start", "in", "out", "gain", "fadeIn", "fadeOut", "vol", "rate", "tone", "loop", "loopVolume", "stream", "dur"]);
const GSAP_TWEEN = /\.(?:to|from|fromTo|set)\s*\(/;

// the film's own source: hf/index.html, hf/film.js, other hf/*.js (not kit-*), hf/blocks, hf/compositions (never the kit copied into hf/kit/)
export function sources(DIR) {
  const hf = path.join(DIR, "hf");
  return walk(hf).filter((f) => /\.(html|js)$/.test(f) && !/(^|[\\/])kit[\\/]/.test(path.relative(hf, f)) && !/^kit-/.test(path.basename(f)))
    .map((f) => ({ f, rel: rel(DIR, f), text: read(f), code: strip(read(f)) }));
}

// ── project.json + vo/: every renderer ──
export function projectChecks(DIR, P) {
  const out = [], lines = Array.isArray(P.lines) ? P.lines : [], ids = new Set(), seen = new Set();
  for (const l of lines) {
    const id = isObj(l) ? l.id : undefined;
    if (typeof id !== "string" || !/^[\w-]+$/.test(id)) out.push(ln("studio_missing_editable_id", `a line has no usable id (${JSON.stringify(id)}): the Studio cannot edit it and vo/ has no file name for it`, "give every line a unique id of letters, digits, _ or -"));
    else if (seen.has(id)) out.push(ln("studio_missing_editable_id", `line id "${id}" is used twice: the Studio edits the first and the voiceover is shared`, "make every line id unique"));
    else { seen.add(id); ids.add(id); }
  }
  let voiced = null;
  try { voiced = JSON.parse(read(path.join(DIR, "vo", "lines.json")) || "null"); } catch { /* unreadable: audio rewrites it */ }
  if (isObj(voiced)) {
    const orphans = Object.keys(voiced).filter((id) => !ids.has(id)), unvoiced = [...ids].filter((id) => !Object.hasOwn(voiced, id));
    if (orphans.length) out.push(ln("linked_clip_orphan", `voiced clip(s) with no script line: ${orphans.slice(0, 4).join(", ")}; they sit in the mix with no line to edit`, "delete the line's vo/ files or put the line back in project.json"));
    if (unvoiced.length) out.push(ln("linked_clip_orphan", `line(s) with no voiced clip: ${unvoiced.slice(0, 4).join(", ")}`, "run `reelwright audio` to voice them"));
    const stale = lines.filter((l) => isObj(l) && Object.hasOwn(voiced, l.id) && isObj(voiced[l.id]) && voiced[l.id].text !== l.text).map((l) => l.id);
    if (stale.length) out.push(ln("linked_clips_out_of_sync", `line text differs from its voiced clip: ${stale.slice(0, 4).join(", ")}; the audio says the old words`, "run `reelwright audio` to re-voice them (or undo the text edit)"));
  }
  if (P.fx !== undefined && isObj(P.fx)) {
    const bad = Object.keys(P.fx).filter((k) => !["vo", "music", "sfx", "lines"].includes(k));
    if (bad.length) out.push(ln("audio_group_no_members", `fx.${bad.join(", fx.")} is not a bus (vo, music, sfx, lines): mix.py never reads it, so its effects are dropped`, "rename it to vo, music or sfx, or delete it"));
    const gone = isObj(P.fx.lines) ? Object.keys(P.fx.lines).filter((id) => !ids.has(id)) : [];
    if (gone.length) out.push(ln("audio_group_no_members", `fx.lines.${gone.slice(0, 4).join(", ")} names no line in project.json: its effect chain is dropped`, "fix the line id or delete the entry"));
  }
  for (const k of ["width", "height"]) if (Number(P[k]) > 8192) out.push(ln("composition_exceeds_inspection_viewport_cap", `${k} ${P[k]} is over 8192: --formats refuses sizes above it and the Studio will not save it, so stills and the player cannot show the whole frame`, "author at 8192 or less and render larger with --resolution"));
  return out;
}

// ── the film's source, no browser (hyperframes) ──
export function staticChecks2(DIR, P) {
  const out = [], src = sources(DIR), film = src.filter((s) => s.rel === "hf/film.js" || s.rel === "hf/index.html" || /^hf\/[^/]+\.js$/.test(s.rel) || s.rel.startsWith("hf/blocks/"));
  const all = film.map((s) => s.code).join("\n");

  for (const s of src.filter((x) => x.rel.startsWith("hf/blocks/") && x.rel.endsWith(".html")))
    if (/data-composition-id\s*=/.test(s.text) && !/data-no-timeline/.test(s.text) && !/__timelines\s*(\[|\.\w+\s*=)/.test(s.text))
      out.push(ln("missing_data_no_timeline", `${s.rel} has a data-composition-id but registers no timeline and has no data-no-timeline: the producer waits for a timeline that never comes`, "drop the data-composition-id, add data-no-timeline, or register window.__timelines[id]"));

  if (/\bgsap\.timeline\s*\(/.test(all) && !/__timelines\s*(\[|\.\w+\s*=)/.test(all) && !/\bKIT\.gsap\s*\(/.test(all))
    out.push(ln("gsap_timeline_not_registered", "gsap.timeline() is created but never given to KIT.gsap or window.__timelines, so render(t) never seeks it and it does not play", "build it inside KIT.gsap((tl, gsap) => { … }) and call .set(t) from render(t)"));

  // KIT.video elements: the variable it is held in, and its id
  const vids = new Set();
  for (const m of all.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*KIT\.video\s*\(/g)) vids.add(m[1]);
  const vidIds = new Set(calls(all, /\bKIT\.video\s*\(/).flatMap((c) => { const o = lastObj(c.args); const m = o && /\bid\s*:\s*(["'])([^"']+)\1/.exec(o); return m ? [m[2]] : []; }));
  const isVid = (t) => vids.has(t) || [...vidIds].some((id) => new RegExp(`^["'\`]#${id}["'\`]$`).test(t));
  for (const c of calls(all, GSAP_TWEEN)) {
    const parts = split(c.args), target = parts[0] || "";
    if (isVid(target) && /\b(visibility|display|autoAlpha)\s*:/.test(parts.slice(1).join(","))) {
      out.push(ln("gsap_animates_clip_element", `a GSAP tween sets visibility, display or autoAlpha on the KIT.video element ${target}; the producer hides and shows it by its data-start window`, "tween opacity on a wrapper div, or show the clip with show(clip, op) in render(t)")); break;
    }
  }
  const srcWrite = [...vids].find((v) => new RegExp(`\\b${v}\\.src\\s*=(?!=)|\\b${v}\\.setAttribute\\s*\\(\\s*["']src["']`).test(all))
    || [...vidIds].find((id) => new RegExp(`getElementById\\s*\\(\\s*["']${id}["']\\s*\\)\\.src\\s*=(?!=)`).test(all));
  if (srcWrite) out.push(ln("media_runtime_src_mutation", `film code changes the src of the KIT.video element ${srcWrite} after it is built; the frames the producer extracts come from the first src`, "make one KIT.video per source, each with its own start and dur"));

  const seenKey = new Set();
  for (const [name, re, ok] of [["KIT.video", /\bKIT\.video\s*\(/, VIDEO_KEYS], ["KIT.audio", /\bKIT\.audio\s*\(/, AUDIO_KEYS]])
    for (const c of calls(all, re)) {
      const o = lastObj(c.args); if (!o) continue;
      for (const k of keysOf(o).filter((x) => !ok.has(x) && !seenKey.has(name + x))) {
        seenKey.add(name + k);
        out.push(k === "ramp"
          ? ln("speed_ramp_on_non_media", "KIT.audio has no `ramp`: only KIT.video clips take a speed ramp, so it is ignored", "retime a sound with rate (0.1 to 10), or put the ramp on KIT.video")
          : ln("media_option_ignored", `${name} has no \`${k}\` option and ignores it (${name === "KIT.video" ? "KIT.video takes volume and vol, not gain; fades are KIT.audio's" : "KIT.audio takes gain, not volume"})`, `use one of: ${[...ok].join(", ")}`));
      }
    }

  const vol = calls(all, GSAP_TWEEN).some((c) => split(c.args).slice(1).some((p) => p.startsWith("{") && keysOf(p).includes("volume"))) || /\.volume\s*=(?!=)/.test(all);
  if (vol) out.push(ln("audio_volume_tween_overrides_gain", "a tween or assignment changes `volume` on a page element; the mp4's sound is the ffmpeg mix, which never reads it", "set gain / vol / fadeIn / fadeOut on KIT.audio, or volume / vol on KIT.video"));

  const roots = [];
  for (const s of src) for (const m of s.text.matchAll(/\burl\(\s*["']?(\/(?!\/)[^"')\s]*)|\b(?:fetch|new URL)\(\s*(["'`])(\/(?!\/)[^"'`$]*)\2|\b(?:src|href)\s*=\s*(["'])(\/(?!\/)[^"']*)\4/g)) roots.push(`${s.rel}: ${m[1] || m[3] || m[5]}`);
  if (roots.length) out.push(ln("root_path_missing_in_preview", `root-absolute path(s) ${roots.slice(0, 2).join(", ")}: a film is a file:// page, so "/" is the disk's root and the file is not found`, "use a path relative to the file (assets/x.png, ../assets/x.png)"));

  for (const s of src.filter((x) => x.rel.startsWith("hf/blocks/") && x.rel.endsWith(".html"))) {
    const caption = /caption/i.test(path.basename(s.rel)) || /\.caption[-_]?(group|word)|hf-catalog-caption/i.test(s.text);
    if (caption && !/\b(?:var|const|let)\s+(?:TRANSCRIPT|WORDS|W)\s*=\s*\[/.test(s.code) && /fetch\s*\([^)]*transcript/i.test(s.code))
      out.push(ln("caption_transcript_not_inline", `${s.rel} fetches the transcript instead of holding a word array, so \`captions\` and the Studio's Captions tab cannot feed it`, "keep `var TRANSCRIPT = [{ text, start, end }, …]` in the block and run `reelwright captions`"));
  }
  return out;
}

// ── the film page: the <video> / <audio> elements, clip windows, mount visibility, fonts ──
const OS_FONTS = new Set(["arial", "arial black", "helvetica", "helvetica neue", "times", "times new roman", "courier", "courier new", "georgia", "verdana", "tahoma", "trebuchet ms",
  "segoe ui", "sf pro", "sf pro display", "sf pro text", "-apple-system", "blinkmacsystemfont", "menlo", "monaco", "consolas", "calibri", "cambria", "comic sans ms", "lucida grande", "palatino", "impact"]);

export async function pageChecks2(page, { DIR }) {
  const out = [];
  const r = await page.evaluate(async () => {
    const M = window.KIT_MEDIA || {}, F = window.FILM || {}, dur = F.DUR, res = { ok: true, dur, media: [], never: [], families: [], declared: [], vo: [] };
    const hasSrc = (e) => !!(e.getAttribute("src") || e.querySelector("source[src]"));
    for (const e of document.querySelectorAll("video, audio"))
      res.media.push({ tag: e.tagName.toLowerCase(), id: e.id, src: hasSrc(e), ds: e.getAttribute("data-start"), muted: e.hasAttribute("muted"), declared: e.getAttribute("data-has-audio") === "true",
        inMount: !!e.closest(".kit-mount"), basis: e.getAttribute("data-hf-media-start-basis"), timedParent: !!(e.parentElement && e.parentElement.closest("[data-start]")) });
    res.clips = [...(M.videos || []).map((v) => ({ kind: "KIT.video", id: v.id, start: v.start, end: v.start + v.dur })),
      ...(M.audio || []).filter((a) => !a.video && a.len != null && Number.isFinite(a.len)).map((a) => ({ kind: "KIT.audio", id: a.src, start: a.start, end: a.start + a.len }))];
    res.vo = Object.entries(F.VO || {}).map(([id, v]) => ({ id, end: v && v.end })).filter((v) => Number.isFinite(v.end));
    if (dur > 0) {
      for (const v of M.videos || []) {   // a KIT.video parented in a KIT.mount host: is the host shown at any time inside the clip's window?
        const el = document.getElementById(v.id), host = el && el.closest(".kit-mount");
        if (!host) continue;
        let seen = false, n = 0;
        for (let i = 0; i <= 120 && !seen; i++) { const t = v.start + v.dur * i / 120; if (t >= dur) break; n++; await window.render(t); seen = getComputedStyle(host).display !== "none"; }
        if (n && !seen) res.never.push(v.id);
      }
      const fam = new Set();
      for (const f of [0.1, 0.5, 0.9]) {
        await window.render(+(dur * f).toFixed(3));
        for (const e of document.body.querySelectorAll("*")) {
          if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
          const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden") continue;
          fam.add(s.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, ""));
        }
      }
      res.families = [...fam]; res.declared = [...document.fonts].map((f) => f.family.replace(/^["']|["']$/g, ""));
      await window.render(0);
    }
    return res;
  }).catch(() => null);
  if (!r || r.ok !== true) return out;   // a page that is not the film (or a stub): nothing to say
  const one = (code, list, msg, fix) => list.length && out.push(ln(code, `${list.slice(0, 3).join(", ")} ${msg}`, fix));
  const label = (m) => `<${m.tag}${m.id ? "#" + m.id : ""}>`;
  one("media_missing_data_start", r.media.filter((m) => m.src && m.ds === null).map(label), "has a src but no data-start: the producer cannot extract its frames or place it, so render and preview differ", "make it with KIT.video(src, { id, start, dur }), which sets data-start");
  one("media_missing_id", r.media.filter((m) => m.ds !== null && !m.id).map(label), "has data-start but no id: the producer finds media by id, so it stays frozen", "give it a unique id");
  one("nested_media_start_basis_ambiguous", r.media.filter((m) => m.inMount && Number(m.ds) > 0 && !m.basis).map(label), "sits in a KIT.mount host with a nonzero data-start: nested start times can be read as film time or as the host's", "set data-hf-media-start-basis to local or global");
  one("video_nested_in_timed_element", r.media.filter((m) => m.tag === "video" && m.ds !== null && m.timedParent).map(label), "is inside an element that also has data-start: the producer ignores the wrapper's offset, so the clip shows the wrong frames", "leave the wrapper untimed, or make the video a direct child of the stage");
  one("video_missing_muted", r.media.filter((m) => m.tag === "video" && m.src && !m.muted).map(label), "has no muted attribute: a preview plays its sound and the mp4 still never has it", "add muted; give a clip its sound with KIT.video(..., { audio: true })");
  one("video_muted_with_declared_audio", r.media.filter((m) => m.tag === "audio" || m.declared).map(label), "carries sound the mp4 never has: the mix is ffmpeg's (vo/, music, KIT.audio, KIT.video audio:true), the page's own audio is dropped", "play it with KIT.audio(src, { start }) or KIT.video(..., { audio: true })");
  const past = r.clips.filter((c) => c.end > r.dur + 0.05).map((c) => `${c.kind} ${c.id} ends at ${+c.end.toFixed(2)}s`).concat(r.vo.filter((v) => v.end > r.dur + 0.05).map((v) => `voiceover ${v.id} ends at ${+v.end.toFixed(2)}s`));
  if (past.length) out.push(ln("clip_ends_past_root_duration", `${past.slice(0, 2).join(", ")}, past the film's ${r.dur}s: it is cut off`, "lengthen KIT.start's dur, or end the clip inside it"));
  one("nested_clip_never_visible", r.never.map((id) => `KIT.video ${id}`), "sits in a KIT.mount host that is hidden for the clip's whole window, so it never appears", "give the clip a start inside the mount's window, or parent it to the stage");
  const bad = r.families.filter((f) => OS_FONTS.has(f.toLowerCase()) && !r.declared.some((d) => d.toLowerCase() === f.toLowerCase()));
  one("system_font_will_alias", bad, "is the first font of a text element and no @font-face declares it: another machine (Colab, CI, a teammate) substitutes a different font", "bundle the font (fonts/, brand.json) or pick a theme font");
  return out;
}
