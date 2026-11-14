// Studio page logic (tools/studio/studio.html). The film runs in the vendored <hyperframes-player>; the timeline is drawn
// from the film page's own window.FILM (VO word times, MUSIC grid, SFX cues), so it shows what sched placed.
// Everything it edits is project.json / brand.json data, sent to the server's POST /__save. No animation code is touched.
const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private window */ } } };
// state-changing calls: POST + JSON (the server also checks Origin, which the browser adds itself)
async function api(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `${r.status} ${r.statusText}`);
  return j;
}
const banner = (msg, ok) => { const b = $("banner"); b.textContent = msg || ""; b.className = msg ? "show" + (ok ? " ok" : "") : ""; };
const status = (msg, err) => { $("status").textContent = msg; $("status").className = err ? "err" : ""; };
const el = (cls, parent, props = {}) => Object.assign(parent.appendChild(document.createElement("div")), { className: cls }, props);

let info, proj, FILM, sel = null, rawDirty = false;
try { info = await (await fetch("/__studio")).json(); proj = JSON.parse(info.project); }
catch (e) { banner(`could not read the project: ${e.message}`); throw e; }
document.title = `studio · ${info.title}`;
const player = $("film"), W = info.width, H = info.height;
const pretty = (o) => JSON.stringify(o, null, 2) + "\n";
const lineOf = (id) => (proj.lines || []).find((l) => l.id === id);

// ── player: the film page at its frame size, the vendored player draws the controls and plays mix.wav ──
player.style.width = `min(100%, calc(52vh * ${W} / ${H}))`; player.style.aspectRatio = `${W} / ${H}`;
player.setAttribute("width", W); player.setAttribute("height", H);
if (info.mix) player.setAttribute("audio-src", info.mix);
player.addEventListener("error", (e) => banner(`player: ${e.detail && e.detail.message}`));
player.addEventListener("timeupdate", (e) => head(e.detail.currentTime));
const ready = new Promise((ok) => player.addEventListener("ready", ok, { once: true }));
player.setAttribute("src", info.page);
await ready;
const win = player.iframeElement.contentWindow;
await win.READY;   // fonts loaded and frame 0 drawn
FILM = win.FILM;
const D = FILM.DUR, fps = FILM.FPS || info.fps;

// ── timeline ──
// Tracks (click a track name to hide it): scenes, VO lines, captions (the VO's words), the waveform and level of mix.wav, beats, SFX cues, nested compositions.
// The visible window v0..v1 is zoomed by double-clicking a scene or a nested composition (drill-down).
const lanes = $("lanes");
let v0 = 0, v1 = D, rng = null, peaks = null, nested = [], onUp = null, selLane = null, snaps = [];
const pct = (t) => `${((t - v0) / (v1 - v0) * 100).toFixed(4)}%`;
const tOf = (e) => { const r = lanes.getBoundingClientRect(); return v0 + (e.clientX - r.left) / r.width * (v1 - v0); };
const num2 = (t) => +t.toFixed(2);
const sub = (cls, parent, text) => parent.append(Object.assign(document.createElement("span"), { textContent: text }));
function build() {
  for (const id of ["ruler", "scenes", "vo", "caps", "beats", "sfx", "nested"]) $("tl-" + id).replaceChildren();
  const span = v1 - v0, step = span > 60 ? 10 : span > 20 ? 5 : span > 8 ? 2 : span > 3 ? 1 : 0.5;
  for (let t = Math.ceil(v0 / step - 1e-9) * step; t <= v1 + 1e-9; t += step) { const k = el("tick", $("tl-ruler"), { style: `left:${pct(t)}` }); sub("", k, num2(t) + "s"); }
  // sched's order is the film's order; JS objects reorder integer-like keys, so sort by start
  const vos = Object.entries(FILM.VO || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.start - b.start);
  let prev = 0;
  for (const v of vos) {
    const gap = lineOf(v.id)?.gap ?? 0.6;   // sched's default when a line has no gap
    // scene = the lead-in before a line (its gap, plus the lead for the first / the beat it snaps to) + the line
    const sc = el("box", $("tl-scenes"), { textContent: `${v.id} · gap ${gap}s`, title: `scene ${v.id}: ${prev.toFixed(2)}–${v.end.toFixed(2)} s · drag sideways to change the gap`,
      style: `left:${pct(prev)};width:${((v.end - prev) / (v1 - v0) * 100).toFixed(4)}%` });
    Object.assign(sc.dataset, { id: v.id, start: prev, end: v.end, vstart: v.start });
    prev = v.end;
    const words = v.text.split(/\s+/).slice(0, 4).join(" ");
    const b = el("box", $("tl-vo"), { textContent: `${v.id}  ${words}`, title: `${v.id}: ${v.text}`, style: `left:${pct(v.start)};width:${((v.end - v.start) / (v1 - v0) * 100).toFixed(4)}%` });
    Object.assign(b.dataset, { id: v.id, start: v.start, end: v.end });
    for (const w of v.words || []) {
      if (w.t + w.d < v0 || w.t > v1) continue;
      const c = el("box cap", $("tl-caps"), { textContent: w.w, title: `${w.w}: ${w.t.toFixed(2)}–${(w.t + w.d).toFixed(2)} s`, style: `left:${pct(w.t)};width:${(w.d / (v1 - v0) * 100).toFixed(4)}%` });
      Object.assign(c.dataset, { id: v.id, start: w.t });
    }
  }
  const M = FILM.MUSIC || {};
  if (M.beat > 0) {
    const perBar = Math.max(1, Math.round(M.bar / M.beat));
    for (let k = 0, t = M.t0; t <= v1 && k < 5000; t = M.t0 + ++k * M.beat) if (t >= v0 && t >= 0) {
      const bar = k % perBar === 0, tk = el("tick" + (bar ? " bar" : ""), $("tl-beats"), { style: `left:${pct(t)}` });
      if (bar) sub("", tk, String(k / perBar + 1));
    }
    if (M.drop != null && M.drop >= v0 && M.drop <= v1) { const d = el("tick drop", $("tl-beats"), { style: `left:${pct(M.drop)}`, title: `drop ${M.drop}s` }); sub("", d, "drop"); }
  }
  for (const c of FILM.cues || []) if (c.t >= v0 && c.t <= v1) { const k = el("tick cue", $("tl-sfx"), { style: `left:${pct(c.t)}`, title: `${c.kind} ${c.t}s` }); k.dataset.start = c.t; }
  for (const n of nested) {
    if (n.end < v0 || n.start > v1) continue;
    const b = el("box", $("tl-nested"), { textContent: n.id, title: `composition ${n.id}: ${n.start.toFixed(2)}–${n.end.toFixed(2)} s, ${n.w}x${n.h} · double-click to zoom in`,
      style: `left:${pct(n.start)};width:${((n.end - n.start) / (v1 - v0) * 100).toFixed(4)}%` });
    Object.assign(b.dataset, { nested: n.id, start: n.start, end: n.end });
  }
  // what a drag snaps to: the beats and bars, the drop, SFX cues, the edges of lines and scenes
  snaps = [0, D, ...(FILM.cues || []).map((c) => c.t), ...vos.flatMap((v) => [v.start, v.end])];
  if (M.beat > 0) for (let k = 0, t = M.t0; t <= D && k < 5000; t = M.t0 + ++k * M.beat) if (t >= 0) snaps.push(t);
  if (M.drop != null) snaps.push(M.drop);
  mark(); drawWave(); drawRange(); drawCrumb();
}
// waveform of mix.wav (peaks from the server), drawn for the visible window
function drawWave() {
  const cv = $("wavecv"), w = cv.parentElement.clientWidth || 800, g = cv.getContext("2d");
  cv.width = w; cv.height = 28; g.clearRect(0, 0, w, 28);
  if (!peaks) return;
  g.fillStyle = "#5eead4";
  for (let x = 0; x < w; x++) {
    const b = peaks.bins[Math.floor((v0 + x / w * (v1 - v0)) / peaks.dur * peaks.bins.length)];
    if (!b) continue;
    const h = Math.max(1, b[0] * 26); g.fillRect(x, 14 - h / 2, 1, h);
  }
}
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
function meter(t) {   // level at the playhead from the same peaks: peak and rms of the bin under it
  if (!peaks) return;
  const b = peaks.bins[Math.min(peaks.bins.length - 1, Math.max(0, Math.floor(t / peaks.dur * peaks.bins.length)))];
  if (!b) return;
  $("meter").textContent = `peak ${isFinite(db(b[0])) ? db(b[0]).toFixed(1) : "-inf"} dB · rms ${isFinite(db(b[1])) ? db(b[1]).toFixed(1) : "-inf"} dB`;
  const bar = document.querySelector("#meterbar i"); bar.style.width = `${Math.max(0, Math.min(100, (db(b[0]) + 60) / 60 * 100))}%`; bar.style.background = b[0] >= 0.99 ? "#f43f5e" : "";
}
fetch("/__peaks").then((r) => r.json()).then((j) => { peaks = j.peaks; drawWave(); meter(now()); }).catch(() => {});
addEventListener("resize", drawWave);
// nested compositions (KIT.mount / KIT.block hosts): their windows are found by seeking the film and watching which hosts are shown
async function scanNested() {
  const hosts = [...win.document.querySelectorAll(".kit-mount")];
  if (!hosts.length) return;
  const found = hosts.map((h) => { const r = h.querySelector("[data-composition-id]"); return { host: h, id: r?.getAttribute("data-composition-id") || "composition", start: null, end: null, w: r?.getAttribute("data-width") || "", h: r?.getAttribute("data-height") || "" }; });
  const keep = player.currentTime || 0, dt = Math.max(1 / fps, D / 400);
  for (let t = 0; t <= D; t += dt) {
    await win.render(t);
    for (const f of found) if (f.host.style.display !== "none") { f.start ??= t; f.end = Math.min(D, t + dt); }
  }
  await win.render(keep);
  nested = found.filter((f) => f.start != null).map(({ host, ...rest }) => rest); build();
}
function head(t) {
  $("playhead").style.left = pct(Math.max(v0, Math.min(v1, t)));
  $("clock").textContent = `${t.toFixed(3)} s / ${D.toFixed(2)} s · frame ${Math.round(t * fps)}`;
  store.set("studio:t", String(t)); meter(t);
}
const seek = (t) => { t = Math.max(0, Math.min(D, Math.round(t * fps) / fps)); player.seek(t); head(t); };
const now = () => player.currentTime || 0;

// tracks: click a name to hide or show it
for (const lab of document.querySelectorAll("#labs [data-lane]")) lab.addEventListener("click", () => {
  const off = !$("tl-" + lab.dataset.lane).classList.toggle("off"); lab.classList.toggle("off-label", !off); drawWave();
});
// drill-down: zoom the window to a scene or nested composition, and back
function zoom(a, b, label) { v0 = Math.max(0, a); v1 = Math.min(D, b); crumb = label; build(); head(now()); }
let crumb = null;
function drawCrumb() {
  const c = $("crumb"); c.replaceChildren();
  if (crumb == null) return;
  c.append("film › ", Object.assign(document.createElement("b"), { textContent: crumb }), " ", Object.assign(document.createElement("a"), { textContent: "[back to the whole film]", onclick: () => { v0 = 0; v1 = D; crumb = null; build(); head(now()); } }));
}
// range select: shift-drag
function drawRange() {
  const r = $("range");
  if (!rng) { r.style.display = "none"; $("rangeinfo").textContent = ""; return; }
  const [a, b] = [Math.min(rng.a, rng.b), Math.max(rng.a, rng.b)];
  Object.assign(r.style, { display: "block", left: pct(a), width: `${((b - a) / (v1 - v0) * 100).toFixed(4)}%` });
  const ids = Object.entries(FILM.VO || {}).filter(([, v]) => v.start < b && v.end > a).map(([id]) => id);
  $("rangeinfo").textContent = `range ${a.toFixed(2)}–${b.toFixed(2)} s (${(b - a).toFixed(2)} s, ${Math.round((b - a) * fps)} frames)${ids.length ? " · lines: " + ids.join(", ") : ""}`;
}
// drag a scene sideways = change its gap. The lines after it ripple (sched places them again after the save); snapping to beats, cues and edges.
function gapDrag(e, box) {
  const id = box.dataset.id, l = lineOf(id), v = FILM.VO[id], g0 = l?.gap ?? 0.6, x0 = e.clientX, wpx = lanes.getBoundingClientRect().width, own = box, w0 = box.getBoundingClientRect().width;
  let dx = 0, moved = false;
  select(id, "tl-scenes");
  lanes.setPointerCapture(e.pointerId);
  const shifted = [...lanes.querySelectorAll("[data-start]")].filter((n) => n !== own && Number(n.dataset.start) >= v.start - 1e-6 && !n.closest("#tl-beats,#tl-nested"));
  lanes.onpointermove = (m) => {
    if (!moved && Math.abs(m.clientX - x0) < 4) return;
    moved = true;
    let d = (m.clientX - x0) / wpx * (v1 - v0), guide = null;
    d = Math.max(-g0, Math.min(60 - g0, d));
    if ($("snap").checked && !m.altKey) {
      let best = 8 / wpx * (v1 - v0);
      for (const s of [...snaps.filter((s) => Math.abs(s - v.start) > 1e-6), now()]) { const diff = s - (v.start + d); if (Math.abs(diff) < best) { best = Math.abs(diff); guide = s; } }
      if (guide != null) d = guide - v.start;
    }
    dx = d;
    const px = d / (v1 - v0) * wpx;
    for (const n of shifted) n.style.transform = `translateX(${px}px)`;
    own.style.width = `${w0 + px}px`;
    const sl = $("snapline"); sl.style.display = guide != null ? "block" : "none"; if (guide != null) sl.style.left = pct(guide);
    own.title = `gap ${Math.max(0, Math.round((g0 + d) * 100) / 100)} s`;
  };
  onUp = () => {
    for (const n of shifted) n.style.transform = ""; own.style.width = ""; $("snapline").style.display = "none";
    if (!moved) return seek(tOf(e));
    const ng = Math.max(0, Math.min(60, Math.round((g0 + dx) * 100) / 100));
    if (l && ng !== g0) { l.gap = ng; select(id, "tl-scenes"); edited(); save("project", pretty(proj)); }
  };
}
lanes.addEventListener("pointerdown", (e) => {
  if (e.button) return;
  const box = e.target.closest(".box"), laneId = e.target.closest(".lane")?.id;
  if (e.shiftKey) {
    rng = { a: tOf(e), b: tOf(e) }; lanes.setPointerCapture(e.pointerId);
    lanes.onpointermove = (m) => { rng.b = tOf(m); drawRange(); };
    onUp = () => { if (Math.abs(rng.b - rng.a) < 1 / fps) rng = null; drawRange(); };
    return;
  }
  if (rng) { rng = null; drawRange(); }
  if (box && laneId === "tl-scenes" && box.dataset.id && FILM.VO?.[box.dataset.id]) return gapDrag(e, box);
  if (box && box.dataset.id) select(box.dataset.id, laneId);
  seek(tOf(e)); lanes.setPointerCapture(e.pointerId); lanes.onpointermove = (m) => seek(tOf(m));
});
lanes.addEventListener("pointerup", () => { lanes.onpointermove = null; const f = onUp; onUp = null; f?.(); });
lanes.addEventListener("dblclick", (e) => {
  const box = e.target.closest(".box");
  if (box?.dataset.nested) zoom(Number(box.dataset.start) - 0.1, Number(box.dataset.end) + 0.1, box.dataset.nested);
  else if (box && e.target.closest("#tl-scenes")) zoom(Number(box.dataset.start) - 0.1, Number(box.dataset.end) + 0.1, box.dataset.id);
});
addEventListener("keydown", (e) => {
  // not while typing; not on the player itself (its own controls take the space bar there)
  if (e.target === player || e.target.closest?.("input,textarea,select,button") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === " ") { e.preventDefault(); player.paused ? player.play() : player.pause(); }
  else if (e.key === "Escape") { rng = null; drawRange(); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault(); player.pause();
    seek(Math.round(now() * fps) / fps + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 1 : 1 / fps));
  }
});

// trim and split the selected line's SCRIPT at the playhead (the word under it); Save places the lines again, then re-voice
function cutAt() {
  const l = sel && lineOf(sel), v = sel && FILM.VO?.[sel];
  if (!l || !v) { status("select a line first", true); return null; }
  const t = now(), ws = v.words || [], txt = l.text.trim().split(/\s+/);
  if (!ws.length || t <= v.start || t >= v.end) { status("put the playhead inside the selected line", true); return null; }
  const before = ws.filter((w) => w.t + w.d / 2 <= t).length, k = ws.length === txt.length ? before : Math.round(before / ws.length * txt.length);
  if (k < 1 || k >= txt.length) { status("the playhead is at the line's edge: nothing to cut", true); return null; }
  return { l, head: txt.slice(0, k).join(" "), tail: txt.slice(k).join(" ") };
}
const cutDone = (m) => { select(sel); edited(); status(m + ": Save, then re-voice (the text changed)"); };
$("btn-split").addEventListener("click", () => {
  const c = cutAt(); if (!c) return;
  let nid = c.l.id + "-b", i = 2; while (lineOf(nid)) nid = `${c.l.id}-b${i++}`;
  proj.lines.splice(proj.lines.indexOf(c.l) + 1, 0, { ...c.l, id: nid, text: c.tail, gap: 0.3 }); c.l.text = c.head;
  cutDone(`split into ${c.l.id} and ${nid}`);
});
$("btn-trim-head").addEventListener("click", () => { const c = cutAt(); if (!c) return; c.l.text = c.tail; cutDone("head trimmed"); });
$("btn-trim-tail").addEventListener("click", () => { const c = cutAt(); if (!c) return; c.l.text = c.head; cutDone("tail trimmed"); });
$("linked").addEventListener("change", mark);

// ── inspector ──
// linked selection: the scene, the VO line, its caption words and the SFX cues inside it are selected together (unlinked: only the track clicked)
function mark() {
  const linked = $("linked").checked, v = sel && FILM.VO?.[sel];
  for (const b of document.querySelectorAll(".box[data-id]")) b.classList.toggle("sel", b.dataset.id === sel && (linked || !selLane || b.parentElement.id === selLane));
  for (const k of document.querySelectorAll("#tl-sfx .tick")) k.classList.toggle("linked", !!(linked && v && Number(k.dataset.start) >= v.start && Number(k.dataset.start) <= v.end));
}
function select(id, laneId = null) {
  sel = id; selLane = laneId; mark(); store.set("studio:sel", id || "");
  const l = id && lineOf(id);
  $("line-none").hidden = !!l; $("line-form").hidden = !l;
  if (!l) return;
  $("sel-id").value = l.id; $("sel-text").value = l.text;
  $("sel-gap").value = $("sel-gap-range").value = l.gap ?? 0.6;
}
function edited() {   // inspector → the in-memory project; the raw editor follows unless the user is typing in it
  status("unsaved changes");
  if (!rawDirty) $("raw-project").value = pretty(proj);
}
$("sel-text").addEventListener("input", (e) => { lineOf(sel).text = e.target.value; edited(); });
for (const id of ["sel-gap", "sel-gap-range"]) $(id).addEventListener("input", (e) => {
  const v = Number(e.target.value);
  if (e.target.value === "" || !Number.isFinite(v)) return;
  lineOf(sel).gap = v; $("sel-gap").value = $("sel-gap-range").value = v; edited();
});
const sty = $("style");
for (const s of ["", ...info.themes]) sty.add(new Option(s || "(none: kit defaults)", s));
sty.value = proj.style || "";
sty.addEventListener("change", () => { if (sty.value) proj.style = sty.value; else delete proj.style; edited(); });
$("title").value = proj.title || "";
$("title").addEventListener("input", (e) => { proj.title = e.target.value; edited(); });
$("fps").value = proj.fps ?? "";
$("fps").addEventListener("input", (e) => { if (e.target.value === "") delete proj.fps; else proj.fps = Number(e.target.value); edited(); });
$("raw-project").value = info.project;
$("raw-project").addEventListener("input", () => { rawDirty = true; status("unsaved changes in project.json"); });
$("raw-brand").value = info.brand ?? "{}\n";   // saving creates brand.json when there was none

async function save(file, text) {
  status("saving…");
  try {
    const r = await api("/__save", { file, text });
    status(r.warn ? `saved, but: ${r.warn}` : "saved: placing the lines…", !!r.warn);   // the page reloads when sched ends
  } catch (e) { status(e.message, true); }
}
$("save-inspector").addEventListener("click", () => save("project", pretty(proj)));
$("save-raw-project").addEventListener("click", () => save("project", $("raw-project").value));
$("save-raw-brand").addEventListener("click", () => save("brand", $("raw-brand").value));

// script changed since the voiceover was made (server compares vo/lines.json): audio needs the network
if (info.stale.length) {
  $("revoice").hidden = false;
  $("revoice-msg").textContent = `script changed — re-voice: ${info.stale.join(", ")}`;
}

// ── jobs: stills, taste, embed, audio. One at a time on the server; its output tail arrives over SSE ──
const BUTTONS = ["btn-still", "btn-sheet", "btn-taste", "btn-embed", "btn-audio", "save-inspector", "save-raw-project", "save-raw-brand", "btn-undo", "btn-redo"];
async function job(body) {
  try { await api("/__run", body); } catch (e) { banner(e.message); }
}
$("btn-still").addEventListener("click", () => job({ cmd: "stills", t: +now().toFixed(2) }));
$("btn-sheet").addEventListener("click", () => job({ cmd: "stills" }));
$("btn-taste").addEventListener("click", () => job({ cmd: "taste" }));
$("btn-embed").addEventListener("click", () => job({ cmd: "embed" }));
$("btn-audio").addEventListener("click", () => job({ cmd: "audio" }));
function renderJob(j) {
  if (!j) return;
  const run = j.state === "running", log = $("log");
  log.textContent = `$ ${j.cmd}${run ? "  (running…)" : j.code === 0 ? "  (done)" : `  (failed, exit ${j.code})`}\n${j.out}`;
  log.className = !run && j.code !== 0 ? "err" : "";
  log.scrollTop = log.scrollHeight;
  for (const b of BUTTONS) $(b).disabled = run;
  banner(!run && j.code !== 0 ? `${j.cmd} failed (exit ${j.code}): see the log below` : "");
}
function renderResults(r) {
  const shown = r.still || (r.sheet && { url: r.sheet });
  $("stillbox").classList.toggle("show", !!shown);
  if (shown) { $("still").src = shown.url; $("stillcap").textContent = r.still ? `still at ${r.still.t} s` : "contact sheet"; }
  $("links").replaceChildren();
  if (r.embed) $("links").append(Object.assign(document.createElement("a"), { href: r.embed, target: "_blank", textContent: "out/embed.html" }));
}
renderJob(info.job); renderResults(info.results);

// ── reload when the project changes (our own save, `audio`, or an edit in an editor), back at the same moment ──
new EventSource("/__events").onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.job) renderJob(m.job);
  if (m.results) renderResults(m.results);
  if (m.changed) location.reload();
};

build();
select(store.get("studio:sel") || null);
const t0 = Number(store.get("studio:t"));
seek(t0 > 0 && t0 <= D ? t0 : 0);
// the right-panel tools (tools/studio/panels.js): undo, audio rack, blur, variables, renders queue, lint, assets, catalog, captions, source
const { initPanels } = await import("./panels.js");
await initPanels({ $, el, api, banner, status, info, proj, FILM, D, fps, win, player, seek, now, save, pretty, edited, lineOf, store, sel: () => sel });
await scanNested().catch((e) => console.warn("nested compositions:", e.message));
window.studioReady = true;   // for tools/selfcheck/studio.mjs
