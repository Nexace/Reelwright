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
const pct = (t) => `${(t / D * 100).toFixed(4)}%`;
function build() {
  for (const id of ["ruler", "scenes", "vo", "beats", "sfx"]) $("tl-" + id).replaceChildren();
  const step = D > 60 ? 10 : D > 20 ? 5 : D > 8 ? 2 : 1;
  for (let t = 0; t <= D; t += step) { const k = el("tick", $("tl-ruler"), { style: `left:${pct(t)}` }); k.append(Object.assign(document.createElement("span"), { textContent: t + "s" })); }
  // sched's order is the film's order; JS objects reorder integer-like keys, so sort by start
  const vos = Object.entries(FILM.VO || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.start - b.start);
  let prev = 0;
  for (const v of vos) {
    const gap = lineOf(v.id)?.gap ?? 0.6;   // sched's default when a line has no gap
    // scene = the lead-in before a line (its gap, plus the lead for the first / the beat it snaps to) + the line
    el("box", $("tl-scenes"), { textContent: `${v.id} · gap ${gap}s`, title: `scene ${v.id}: ${prev.toFixed(2)}–${v.end.toFixed(2)} s`,
      style: `left:${pct(prev)};width:${pct(v.end - prev)}` }).dataset.id = v.id;
    prev = v.end;
    const words = v.text.split(/\s+/).slice(0, 4).join(" ");
    const b = el("box", $("tl-vo"), { textContent: `${v.id}  ${words}`, title: `${v.id}: ${v.text}`, style: `left:${pct(v.start)};width:${pct(v.end - v.start)}` });
    Object.assign(b.dataset, { id: v.id, start: v.start, end: v.end });
  }
  const M = FILM.MUSIC || {};
  if (M.beat > 0) {
    const perBar = Math.max(1, Math.round(M.bar / M.beat));
    for (let k = 0, t = M.t0; t <= D && k < 5000; t = M.t0 + ++k * M.beat) if (t >= 0) {
      const bar = k % perBar === 0, tk = el("tick" + (bar ? " bar" : ""), $("tl-beats"), { style: `left:${pct(t)}` });
      if (bar) tk.append(Object.assign(document.createElement("span"), { textContent: String(k / perBar + 1) }));
    }
    if (M.drop != null) { const d = el("tick drop", $("tl-beats"), { style: `left:${pct(M.drop)}`, title: `drop ${M.drop}s` }); d.append(Object.assign(document.createElement("span"), { textContent: "drop" })); }
  }
  for (const c of FILM.cues || []) el("tick cue", $("tl-sfx"), { style: `left:${pct(c.t)}`, title: `${c.kind} ${c.t}s` });
  mark();
}
function head(t) {
  $("playhead").style.left = pct(Math.max(0, Math.min(D, t)));
  $("clock").textContent = `${t.toFixed(3)} s / ${D.toFixed(2)} s · frame ${Math.round(t * fps)}`;
  store.set("studio:t", String(t));
}
const seek = (t) => { t = Math.max(0, Math.min(D, Math.round(t * fps) / fps)); player.seek(t); head(t); };
const now = () => player.currentTime || 0;

// click / drag anywhere on the lanes seeks; clicking a box also selects its line
const lanes = $("lanes");
const at = (e) => { const r = lanes.getBoundingClientRect(); return (e.clientX - r.left) / r.width * D; };
lanes.addEventListener("pointerdown", (e) => {
  const box = e.target.closest(".box");
  if (box) select(box.dataset.id);
  seek(at(e)); lanes.setPointerCapture(e.pointerId); lanes.onpointermove = (m) => seek(at(m));
});
lanes.addEventListener("pointerup", () => { lanes.onpointermove = null; });
addEventListener("keydown", (e) => {
  // not while typing; not on the player itself (its own controls take the space bar there)
  if (e.target === player || e.target.closest?.("input,textarea,select,button") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === " ") { e.preventDefault(); player.paused ? player.play() : player.pause(); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault(); player.pause();
    seek(Math.round(now() * fps) / fps + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 1 : 1 / fps));
  }
});

// ── inspector ──
function mark() { for (const b of document.querySelectorAll(".box")) b.classList.toggle("sel", b.dataset.id === sel); }
function select(id) {
  sel = id; mark(); store.set("studio:sel", id || "");
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
const BUTTONS = ["btn-still", "btn-sheet", "btn-taste", "btn-embed", "btn-audio", "save-inspector", "save-raw-project", "save-raw-brand"];
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
window.studioReady = true;   // for tools/selfcheck/studio.mjs
