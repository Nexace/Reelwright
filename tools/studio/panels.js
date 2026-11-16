// The studio's right-panel tools (H5), loaded by studio.js after the timeline: tabs for the inspector (studio.html), Audio FX rack, Blur, Variables,
// Renders queue, Lint, Assets, Catalog, Captions and Source, and the Undo / Redo buttons. Everything here edits data the server validates
// (tools/studio/panels.mjs, server.mjs): project.json fields, transcript.json, and (only with `studio --edit-source`) text files inside the project.
const h = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.flat().filter((k) => k != null)); return n; };
const get = async (url) => { const r = await fetch(url); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `${r.status}`); return j; };
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n > 1024 ? `${Math.round(n / 1024)} kB` : `${n} B`);
const copy = async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };

export async function initPanels(c) {
  const { $, api, status, banner, info, proj, FILM, edited, pretty, save, store } = c;
  const aside = document.querySelector("aside"), mount = info.page.replace(/\/(hf|film)\/index\.html$/, "");
  const TABS = [["inspector", "Inspector"], ["props", "Props"], ["audio", "Audio"], ["blur", "Blur"], ["vars", "Variables"], ["renders", "Renders"], ["lint", "Lint"], ["assets", "Assets"], ["catalog", "Catalog"], ["captions", "Captions"], ["slideshow", "Slideshow"], ["source", "Source"]];
  const tabs = $("tabs"), secs = { inspector: $("tab-inspector") }, loaders = {};
  for (const [id] of TABS) if (id !== "inspector") { secs[id] = h("section", { id: "tab-" + id, className: "tab", hidden: true }); aside.append(secs[id]); }
  function show(id) {
    for (const [k, s] of Object.entries(secs)) s.hidden = k !== id;
    for (const b of tabs.children) b.classList.toggle("on", b.dataset.tab === id);
    store.set("studio:tab", id); loaders[id]?.();
  }
  for (const [id, label] of TABS) tabs.append(h("button", { textContent: label, onclick: () => show(id) }, )), tabs.lastChild.dataset.tab = id;
  const save1 = (msg) => { status(msg || "unsaved changes"); return save("project", pretty(proj)); };
  const note = (sec, text, cls = "") => sec.append(h("div", { className: cls, textContent: text, style: "margin:4px 0;color:var(--muted)" }));

  // ── history: undo / redo every write the studio made ──
  const hist = async () => { try { const j = await get("/__history"); $("btn-undo").disabled = !j.undo; $("btn-redo").disabled = !j.redo; $("btn-undo").title = j.undo ? `undo the last write (${j.last})` : "nothing to undo"; } catch { /* old server */ } };
  for (const [id, path] of [["btn-undo", "/__undo"], ["btn-redo", "/__redo"]]) $(id).addEventListener("click", async () => {
    try { const r = await api(path, {}); status(`${path.slice(3)}: ${r.file} restored`); } catch (e) { status(e.message, true); }
  });
  addEventListener("keydown", (e) => {   // not while typing in a field (the field's own undo is the browser's)
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || e.target.closest?.("input,textarea,select")) return;
    e.preventDefault(); $(e.shiftKey ? "btn-redo" : "btn-undo").click();
  });
  await hist();

  // ── Audio FX rack: presets and jobs per bus (project.json "fx") and the limiter; Remix runs `mix` (offline) ──
  loaders.audio = async () => {
    const s = secs.audio; s.replaceChildren(h("h2", { textContent: "Audio FX rack" }));
    const fx = await get("/__fx").catch(() => ({ presets: [], jobs: [] })), cur = proj.fx || {};
    const sel = (value, onchange, custom) => {
      const o = h("select", { onchange: (e) => onchange(e.target.value) }, h("option", { value: "", textContent: "(none)" }),
        h("optgroup", { label: "jobs" }, fx.jobs.map((n) => h("option", { value: n, textContent: n }))), h("optgroup", { label: "presets" }, fx.presets.map((n) => h("option", { value: n, textContent: n }))));
      if (custom) o.append(h("option", { value: "__custom", textContent: "(a custom chain: edit in project.json)", disabled: true }));
      o.value = custom ? "__custom" : value || ""; return o;
    };
    const set = (obj, key, v) => { if (v) obj[key] = v; else delete obj[key]; };
    for (const [bus, label] of [["vo", "voice"], ["music", "music"], ["sfx", "sound effects"]]) {
      s.append(h("label", { textContent: label }), sel(typeof cur[bus] === "string" ? cur[bus] : "", (v) => { proj.fx ||= {}; set(proj.fx, bus, v); edited(); }, cur[bus] != null && typeof cur[bus] !== "string"));
    }
    const l = c.sel && proj.lines.find((x) => x.id === c.sel());
    if (l) s.append(h("label", { textContent: `line "${l.id}" only` }), sel(cur.lines?.[l.id] || "", (v) => { proj.fx ||= {}; proj.fx.lines ||= {}; set(proj.fx.lines, l.id, v); if (!Object.keys(proj.fx.lines).length) delete proj.fx.lines; edited(); }));
    s.append(h("label", { className: "inl", style: "margin-top:8px" }, h("input", { type: "checkbox", checked: !!proj.limiter, onchange: (e) => { if (e.target.checked) proj.limiter = true; else delete proj.limiter; edited(); } }), " true-peak limiter on the master"));
    s.append(h("div", { style: "margin-top:8px" }, h("button", { className: "primary", textContent: "Save", onclick: () => save1() }), " ", h("button", { textContent: "Remix (mix, offline)", title: "runs `mix`: applies the rack to mix.wav; the waveform and player follow", onclick: () => api("/__run", { cmd: "mix" }).catch((e) => banner(e.message)) })));
    note(s, "Presets and jobs are the rack of tools/audio_fx.py (17 effects, ffmpeg only). Save, then Remix to hear it. Custom chains: project.json \"fx\" (docs/playbook/audio-fx.md).");
  };

  // ── Blur: project.json "motionBlur" ──
  loaders.blur = () => {
    const s = secs.blur, m = proj.motionBlur, o = typeof m === "object" ? m : {}; s.replaceChildren(h("h2", { textContent: "Motion blur" }));
    const on = h("input", { type: "checkbox", checked: !!m }), sh = h("input", { type: "number", min: 1, max: 360, value: o.shutter ?? 180 }), sm = h("input", { type: "number", min: 2, max: 64, value: o.samples ?? 8 });
    const apply = () => { if (!on.checked) delete proj.motionBlur; else proj.motionBlur = { shutter: Number(sh.value), samples: Number(sm.value) }; edited(); };
    for (const n of [on, sh, sm]) n.addEventListener("input", apply);
    s.append(h("label", { className: "inl" }, on, " motion blur on frames"), h("label", { textContent: "shutter (degrees, 180 = a half-frame exposure)" }), sh, h("label", { textContent: "samples per frame" }), sm,
      h("div", { style: "margin-top:8px" }, h("button", { className: "primary", textContent: "Save", onclick: () => save1() })));
    note(s, "Costs about `samples` times the render time. Both renderers: docs/playbook/motion-blur.md.");
  };

  // ── Variables: the declared defaults of project.json "variables" ──
  loaders.vars = () => {
    const s = secs.vars, vs = proj.variables || []; s.replaceChildren(h("h2", { textContent: "Composition variables" }));
    if (!vs.length) note(s, "No variables declared. Add one below, or see docs/playbook/variables.md.");
    for (const v of vs) {
      const inp = v.type === "boolean" ? h("input", { type: "checkbox", checked: !!v.default, onchange: (e) => { v.default = e.target.checked; edited(); } })
        : v.type === "enum" ? h("select", { onchange: (e) => { v.default = e.target.value; edited(); } }, (v.options || []).map((o) => { const val = typeof o === "object" ? o.value : o; return h("option", { value: val, textContent: val, selected: val === v.default }); }))
        : v.type === "number" ? h("input", { type: "number", value: v.default, oninput: (e) => { if (e.target.value !== "") { v.default = Number(e.target.value); edited(); } } })
        : h("input", { type: v.type === "color" ? "text" : "text", value: typeof v.default === "string" ? v.default : JSON.stringify(v.default), oninput: (e) => { v.default = e.target.value; edited(); } });
      s.append(h("label", { textContent: `${v.label || v.id} (${v.id}: ${v.type})` }), inp);
    }
    const id = h("input", { type: "text", placeholder: "id" }), type = h("select", {}, ["string", "number", "color", "boolean", "enum", "font", "image"].map((t) => h("option", { value: t, textContent: t }))), def = h("input", { type: "text", placeholder: "default" });
    s.append(h("h2", { textContent: "Add a variable" }), id, type, def, h("button", { textContent: "Add", onclick: () => {
      const d = type.value === "number" ? Number(def.value) : type.value === "boolean" ? def.value === "true" : def.value;
      (proj.variables ||= []).push({ id: id.value, type: type.value, default: d, ...(type.value === "enum" ? { options: def.value.split("|") } : {}) }); if (type.value === "enum") proj.variables.at(-1).default = proj.variables.at(-1).options[0];
      edited(); loaders.vars(); } }), h("div", { style: "margin-top:8px" }, h("button", { className: "primary", textContent: "Save", onclick: () => save1() })));
    note(s, "Defaults are validated on save (the same checks as `--variables`). For an enum, type the options as a|b|c in the default box. Per-run overrides: `--variables '{…}'`, `batch`.");
  };

  // ── Renders: a queue of `film` runs, one at a time on the server ──
  let queue = info.queue || [];
  const drawQueue = () => {
    const q = $("rq"); if (!q) return; q.replaceChildren(...(queue.length ? queue.slice().reverse().map((r) => h("div", { className: "item" }, `#${r.id} ${r.label} · `,
      h("span", { className: r.state === "done" ? "ok" : r.state === "failed" ? "bad" : r.state === "running" ? "warn" : "", textContent: r.state + (r.state === "failed" ? ` (exit ${r.code})` : "") }), " ",
      ["queued", "running"].includes(r.state) ? h("button", { textContent: "cancel", onclick: () => api("/__cancel", { id: r.id }).catch((e) => banner(e.message)) }) : null)) : [h("div", { textContent: "nothing queued", style: "color:var(--muted)" })]));
  };
  loaders.renders = () => {
    const s = secs.renders; s.replaceChildren(h("h2", { textContent: "Render queue" }));
    const pick = (label, opts) => { const n = h("select", {}, h("option", { value: "", textContent: "(project.json)" }), opts.map((o) => h("option", { value: o, textContent: o }))); s.append(h("label", { textContent: label }), n); return n; };
    const f = pick("format", ["16x9", "9x16", "1x1", "4x5", "16x10"]), r = pick("resolution", ["4k", "portrait-4k", "square-4k"]), q = pick("quality", ["draft", "looks", "standard", "high", "delivery"]);
    const fps = h("input", { type: "number", min: 1, max: 240, placeholder: `fps (${info.fps})` }), gpu = h("input", { type: "checkbox" });
    s.append(h("label", { textContent: "fps" }), fps, h("label", { className: "inl", style: "margin-top:6px" }, gpu, " GPU (hardware browser; frames can differ across machines)"),
      h("div", { style: "margin-top:8px" }, h("button", { className: "primary", textContent: "Queue render", onclick: () => api("/__render", { format: f.value, resolution: r.value, quality: q.value, fps: fps.value ? Number(fps.value) : null, gpu: gpu.checked }).catch((e) => banner(e.message)) })),
      h("h2", { textContent: "Queue" }), h("div", { id: "rq" }));
    note(s, "Runs `film` (sched, info, mix, frames, encode) with these options; the log pane under the timeline shows the running one. Output: the mp4 at project.json \"out\" (the format and look names go in its file name).");
    drawQueue();
  };

  // ── Lint: the static HyperFrames lint and the layout audit ──
  loaders.lint = () => {
    const s = secs.lint; s.replaceChildren(h("h2", { textContent: "Lint" }));
    const out = h("div");
    const run = async () => { out.replaceChildren(h("div", { textContent: "linting…" })); try {
      const j = await get("/__lint");
      out.replaceChildren(...(j.note ? [h("div", { textContent: j.note, className: "warn" })] : []), h("h2", { textContent: `Errors (${j.gate.length}) — fail qa` }), ...j.gate.map((l) => h("div", { className: "item bad", textContent: l })),
        h("h2", { textContent: `Warnings (${j.warn.length})` }), ...j.warn.map((l) => h("div", { className: "item warn", textContent: l })), !j.gate.length && !j.warn.length ? h("div", { className: "ok", textContent: "no findings" }) : null);
    } catch (e) { out.replaceChildren(h("div", { className: "bad", textContent: e.message })); } };
    s.append(h("button", { className: "primary", textContent: "Lint now", onclick: run }), " ", h("button", { textContent: "Layout check (browser, in the log)", onclick: () => api("/__run", { cmd: "check" }).catch((e) => banner(e.message)) }), out);
    note(s, "Static lint is the one `qa` runs (tools/checks/hf-lint.mjs, rules in docs/playbook/qa-lint.md).");
    run();
  };

  // ── Assets: the project's media and ~/.media ──
  loaders.assets = async () => {
    const s = secs.assets; s.replaceChildren(h("h2", { textContent: "Project assets" }));
    const j = await get("/__assets").catch((e) => ({ project: [], global: null, error: e.message }));
    if (!j.project.length) note(s, "No media under assets/, media/, hf/media/, clips/, music/ or fonts/.");
    for (const a of j.project) s.append(h("div", { className: "item" }, a.kind === "image" ? h("img", { src: `${mount}/${a.path}`, style: "max-height:48px;max-width:96px;float:right" }) : null, h("b", { textContent: a.path }), h("small", { textContent: `${a.kind} · ${kb(a.size)}` }),
      h("button", { textContent: "copy path", onclick: async (e) => { e.target.textContent = (await copy(a.path.replace(/^hf\//, ""))) ? "copied" : a.path; } })));
    s.append(h("h2", { textContent: `Global (${j.globalDir})` }));
    if (!j.global) note(s, `${j.globalDir} does not exist here: put shared media in it and it is listed (names only; copy a file into this project's assets/ to use it).`);
    else for (const a of j.global) s.append(h("div", { className: "item" }, h("b", { textContent: a.name }), h("small", { textContent: `${a.kind} · ${kb(a.size)}` })));
  };

  // ── Catalog: search the HyperFrames catalog, Add, or ask an agent ──
  loaders.catalog = () => {
    const s = secs.catalog; s.replaceChildren(h("h2", { textContent: "HyperFrames catalog" }));
    const q = h("input", { type: "text", placeholder: "search: caption, lower third, chart…" }), type = h("select", {}, [["", "components and blocks"], ["component", "components"], ["block", "blocks"]].map(([v, t]) => h("option", { value: v, textContent: t }))), out = h("div");
    const go = async () => { const j = await get(`/__catalog?q=${encodeURIComponent(q.value)}&type=${type.value}`).catch((e) => ({ items: [], total: 0, error: e.message }));
      out.replaceChildren(h("small", { textContent: `${j.total} found${j.total > j.items.length ? `, showing ${j.items.length}` : ""}` }), ...j.items.map((i) => h("div", { className: "item" }, h("b", { textContent: i.name }), ` ${i.type}${i.duration ? ` · ${i.duration} s` : ""}`, h("small", { textContent: i.title + (i.tags.length ? " · " + i.tags.join(", ") : "") }),
        h("button", { textContent: "Add", title: `reelwright add ${i.name}`, onclick: () => api("/__add", { name: i.name }).then(() => status(`adding ${i.name}…`)).catch((e) => banner(e.message)) }), " ",
        h("button", { textContent: "Ask agent", title: "copy a prompt for a coding agent", onclick: async (e) => { const p = `Add the HyperFrames catalog item "${i.name}" to ${info.dir}: run \`reelwright add ${info.dir} ${i.name}\`, then use it from hf/film.js with KIT.block("${i.name}") timed from W()/V().`; e.target.textContent = (await copy(p)) ? "copied" : p; } })))); };
    q.addEventListener("input", () => go()); type.addEventListener("change", go);
    s.append(q, type, out); go();
    note(s, "Add copies the component into hf/blocks/ (`reelwright add`); use it with KIT.block.");
  };

  // ── Captions: edit transcript.json (what the caption-* components read) ──
  loaders.captions = async () => {
    const s = secs.captions; s.replaceChildren(h("h2", { textContent: "Caption words" }));
    const t = (await get("/__transcript").catch(() => ({}))).text;
    let words = null; try { words = t && JSON.parse(t); } catch { /* bad file: shown empty */ }
    const fromVo = !Array.isArray(words);
    if (fromVo) words = Object.values(FILM.VO || {}).sort((a, b) => a.start - b.start).flatMap((v) => (v.words || []).map((w) => ({ text: w.w, start: +w.t.toFixed(3), end: +(w.t + w.d).toFixed(3) })));
    note(s, fromVo ? "No transcript.json yet: these are the voiceover's words. Save writes transcript.json." : `transcript.json: ${words.length} words.`);
    const tb = h("table", {}, h("tr", {}, ["word", "start", "end"].map((x) => h("th", { textContent: x }))));
    words.slice(0, 600).forEach((w, i) => tb.append(h("tr", {}, h("td", {}, h("input", { type: "text", value: w.text, oninput: (e) => { words[i].text = e.target.value; } })),
      ...["start", "end"].map((k) => h("td", {}, h("input", { type: "number", step: 0.01, value: w[k], style: "width:70px", oninput: (e) => { words[i][k] = Number(e.target.value); } }))))));
    s.append(tb, h("div", { style: "margin-top:8px" }, h("button", { className: "primary", textContent: "Save transcript.json", onclick: () => api("/__transcript", { words }).then(() => status("transcript.json saved")).catch((e) => status(e.message, true)) }), " ",
      h("button", { textContent: "From the voiceover", title: "runs `captions`: transcript.json from timeline.json", onclick: () => api("/__run", { cmd: "captions" }).catch((e) => banner(e.message)) })));
    if (words.length > 600) note(s, `Showing the first 600 of ${words.length} words; the rest are kept as they are.`, "warn");
  };

  // ── Slideshow: a folder of this project's images and clips → slideshows/<name>/, a film of its own (`reelwright slideshow`) ──
  loaders.slideshow = async () => {
    const s = secs.slideshow; s.replaceChildren(h("h2", { textContent: "Slideshow" }));
    const j = await get("/__slideshow").catch((e) => ({ folders: [], built: [], transitions: [], error: e.message }));
    if (!j.folders.length) return note(s, j.error || "No folder of this project holds images or clips. Put some in a folder next to project.json (for example photos/), then reopen this tab.");
    const folder = h("select", {}, j.folders.map((f) => h("option", { value: f.name, textContent: `${f.name} (${f.images} images, ${f.clips} clips)` })));
    const sec = h("input", { type: "number", min: 0.5, max: 60, step: 0.1, value: 3 }), td = h("input", { type: "number", min: 0, max: 5, step: 0.1, value: 0.6 });
    const tr = h("select", {}, j.transitions.map((t) => h("option", { value: t, textContent: t, selected: t === "fade" })));
    const name = h("input", { type: "text", value: "slideshow", pattern: "[a-z0-9][a-z0-9-]*" });
    s.append(h("label", { textContent: "folder" }), folder, h("label", { textContent: "seconds per still (clips keep their own length, up to 8 s)" }), sec,
      h("label", { textContent: "transition length (s)" }), td, h("label", { textContent: "transition" }), tr, h("label", { textContent: "name" }), name,
      h("div", { style: "margin-top:8px" }, h("button", { id: "ss-build", className: "primary", textContent: "Build slideshow", onclick: () => api("/__slideshow", { folder: folder.value, seconds: +sec.value, tdur: +td.value, transition: tr.value, name: name.value })
        .then((r) => status(`building ${r.out}…`)).catch((e) => banner(e.message)) })));
    note(s, `Builds a separate film in slideshows/<name>/ (${j.size}, a music bed, no voiceover); this film is not touched. Open it with \`reelwright studio <project>/slideshows/<name>\`, render with \`reelwright all\` on that folder.`);
    if (j.built.length) note(s, `already built: ${j.built.join(", ")}`);
  };

  // ── Source: the project's files; editing only with `studio --edit-source` ──
  loaders.source = async () => {
    const s = secs.source; s.replaceChildren(h("h2", { textContent: "Files" }));
    const j = await get("/__files").catch((e) => ({ files: [], error: e.message })), box = h("textarea", { rows: 18, spellcheck: false, readOnly: true }), name = h("div", { style: "color:var(--muted)" });
    let cur = null;
    const open = async (p) => { const f = await get(`/__file?path=${encodeURIComponent(p)}`).catch((e) => ({ error: e.message })); if (f.error) return status(f.error, true);
      cur = f; name.textContent = `${f.path}${f.editable ? "" : " (read only)"} · ${f.text.split("\n").length} lines`; box.value = f.text; box.readOnly = !f.editable; sv.hidden = !f.editable; };
    const sv = h("button", { className: "primary", textContent: "Save file", hidden: true, onclick: () => api("/__source", { path: cur.path, text: box.value }).then(() => status(`${cur.path} saved`)).catch((e) => status(e.message, true)) });
    s.append(h("div", { style: "max-height:160px;overflow:auto;border:1px solid var(--line)" }, j.files.filter((f) => /\.(js|mjs|html|css|json|md|txt|svg|csv)$/i.test(f.path)).map((f) => h("div", { style: "cursor:pointer;padding:1px 4px", textContent: `${f.path}  ${kb(f.size)}`, onclick: () => open(f.path) }))), name, box, sv);
    note(s, j.editSource ? "Source editing is on (--edit-source): saves are undoable. The studio never edits files outside this project." : "Read only. Start the studio with --edit-source to edit film.js, hf/*.html and the like here.");
  };

  // ── Props sidebar (Ctrl/Cmd+J): the film's per-run data, from props.schema.json or the declared variables; props.json is what the page sees as window.PROPS
  // (KIT.props(), tools/props.js) and what "Render with these props" passes as --props-file ──
  loaders.props = async () => {
    const s = secs.props; s.replaceChildren(h("h2", { textContent: "Props" }));
    const j = await get("/__props").catch((e) => ({ schema: null, props: {}, error: e.message })), props = { ...j.props };
    if (j.error) note(s, j.error, "bad");
    const sch = j.schema, ps = sch?.properties || {};
    if (!sch) note(s, "No props.schema.json and no declared variables: write props as JSON below (docs/playbook/codecs.md).");
    const errs = h("div", { className: "bad" }), set = (k, v) => { if (v === undefined) delete props[k]; else props[k] = v; };
    for (const [k, d] of Object.entries(ps)) {
      const cur = k in props ? props[k] : d.default, req = (sch.required || []).includes(k);
      const lab = h("label", { textContent: `${k}${req ? " *" : ""}${d.description ? ` — ${d.description}` : ""} (${[].concat(d.type || "any").join("|")})` });
      let inp;
      if (d.enum) inp = h("select", { onchange: (e) => set(k, d.enum.find((x) => String(x) === e.target.value)) }, d.enum.map((x) => h("option", { value: String(x), textContent: String(x), selected: x === cur })));
      else if (d.type === "boolean") inp = h("input", { type: "checkbox", checked: !!cur, onchange: (e) => set(k, e.target.checked) });
      else if (d.type === "number" || d.type === "integer") inp = h("input", { type: "number", value: cur ?? "", min: d.minimum, max: d.maximum, step: d.type === "integer" ? 1 : "any", oninput: (e) => set(k, e.target.value === "" ? undefined : Number(e.target.value)) });
      else if (d.type === "string") inp = h("input", { type: "text", value: cur ?? "", oninput: (e) => set(k, e.target.value) });
      else inp = h("textarea", { rows: 3, value: cur === undefined ? "" : JSON.stringify(cur, null, 1), oninput: (e) => { try { set(k, JSON.parse(e.target.value)); errs.textContent = ""; } catch { errs.textContent = `${k}: not valid JSON yet`; } } });
      s.append(lab, inp);
    }
    const raw = h("textarea", { rows: 6, spellcheck: false, value: JSON.stringify(props, null, 2), style: "margin-top:6px" });
    const sv = async () => { errs.textContent = ""; try { await api("/__props", { props: raw.dataset.dirty ? JSON.parse(raw.value) : props }); status("props.json saved: the page reloads with them"); return true; } catch (e) { errs.textContent = e.message; return false; } };
    raw.addEventListener("input", () => { raw.dataset.dirty = "1"; });
    s.append(errs, h("h2", { textContent: "props.json" }), raw, h("div", { style: "margin-top:8px" }, h("button", { className: "primary", textContent: "Save props", onclick: sv }), " ",
      h("button", { textContent: "Render with these props", title: "saves props.json, then queues a film render with --props-file", onclick: async () => { if (await sv()) api("/__render", { props: true }).then(() => { status("render queued with props"); show("renders"); }).catch((e) => banner(e.message)); } })));
    note(s, "The player shows the film with these props (window.PROPS); checked against the schema on save, as `--props` is. Renders from the UI use the server's fixed render options only.");
  };

  // ── canvas zoom, the frame picker, the quick switcher and the shortcuts (Ctrl/Cmd+K, Ctrl/Cmd+J, + - 0, ?) ──
  const box = $("playerbox"), bar2 = $("bar2"), W = info.width, H = info.height, base = c.player.style.width;
  let z = 1; const zl = h("span", { id: "zoomlabel", textContent: "100%", style: "color:var(--muted);min-width:42px;text-align:center" });
  const setZoom = (v) => { z = Math.max(0.25, Math.min(4, Math.round(v * 100) / 100)); c.player.style.width = z === 1 ? base : `calc(${base} * ${z})`; box.classList.toggle("zoomed", z !== 1); zl.textContent = `${Math.round(z * 100)}%`; };
  bar2.append(h("button", { textContent: "−", title: "zoom the frame out (-)", onclick: () => setZoom(z / 1.25) }), zl, h("button", { textContent: "+", title: "zoom the frame in (+)", onclick: () => setZoom(z * 1.25) }), h("button", { textContent: "Fit", title: "100% (0)", onclick: () => setZoom(1) }));
  box.addEventListener("wheel", (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); setZoom(z * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
  // click-to-select in the frame: with Pick on, a click on the frame finds the element under it in the film page and selects the line it belongs to
  const pick = h("div", { id: "pick" }), pickbox = h("div", { id: "pickbox" }), pinfo = h("span", { id: "pickinfo", style: "color:var(--muted);font-size:12px" });
  box.append(pick, pickbox);
  const place = () => { const r = c.player.iframeElement.getBoundingClientRect(), b = box.getBoundingClientRect(); Object.assign(pick.style, { left: r.left - b.left + box.scrollLeft + "px", top: r.top - b.top + box.scrollTop + "px", width: r.width + "px", height: r.height + "px" }); };
  const pickBtn = h("button", { textContent: "Pick in frame", title: "click an element in the frame to select its line (P)", onclick: () => setPick(!pick.classList.contains("on")) });
  const setPick = (on) => { pick.classList.toggle("on", on); pickBtn.classList.toggle("primary", on); if (on) place(); else pickbox.style.display = "none"; };
  bar2.append(pickBtn, pinfo);
  pick.addEventListener("click", (e) => {
    const r = c.player.iframeElement.getBoundingClientRect(), win = c.win, sc = r.width / win.innerWidth;
    let t = win.document.elementFromPoint((e.clientX - r.left) / sc, (e.clientY - r.top) / sc);
    while (t && ["HTML", "BODY"].includes(t.tagName)) t = null;
    if (t && /^(root|stage)$/.test(t.id)) t = null;
    if (!t) { pinfo.textContent = "nothing there but the background"; pickbox.style.display = "none"; return; }
    const tr = t.getBoundingClientRect(), b = box.getBoundingClientRect(), text = (t.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80), norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim();
    Object.assign(pickbox.style, { display: "block", left: r.left - b.left + box.scrollLeft + tr.left * sc + "px", top: r.top - b.top + box.scrollTop + tr.top * sc + "px", width: tr.width * sc + "px", height: tr.height * sc + "px" });
    // a text element that holds (a part of) a line's words belongs to that line; anything else belongs to the line being spoken at the playhead
    const hit = norm(text).length >= 3 && proj.lines.find((l) => norm(l.text).includes(norm(text)) || norm(text).includes(norm(l.text)));
    const at = c.now(), live = Object.entries(FILM.VO || {}).sort((a, b) => a[1].start - b[1].start).find(([, v]) => at <= v.end)?.[0];
    const id = hit?.id || live;
    pinfo.textContent = `<${t.tagName.toLowerCase()}${t.id ? "#" + t.id : ""}${t.className && typeof t.className === "string" ? "." + t.className.trim().split(/\s+/).join(".") : ""}> ${text ? `"${text}"` : ""} → ${id ? `line ${id}${hit ? " (its words)" : " (spoken here)"}` : "no line"}`;
    if (id) c.select(id);
  });
  addEventListener("resize", () => pick.classList.contains("on") && place());
  // quick switcher
  const qs = h("div", { id: "qs" }), qin = h("input", { type: "text", placeholder: "jump to a line, a panel or an action…" }), qul = h("ul"); qs.append(h("div", {}, qin, qul)); document.body.append(qs);
  const help = h("div", { id: "help" }, h("b", { textContent: "Shortcuts" }), ...[["space", "play / pause"], ["← →", "one frame (shift: one second)"], ["Ctrl/Cmd K", "quick switcher"], ["Ctrl/Cmd J", "props sidebar"], ["Ctrl/Cmd Z", "undo (shift: redo)"], ["+ − 0", "zoom the frame"], ["P", "pick in frame"], ["?", "this list"], ["Esc", "close, clear the range"]].map(([k, d]) => h("div", {}, h("kbd", { textContent: k }), " " + d)));
  document.body.append(help);
  const actions = () => [
    ...proj.lines.map((l) => ({ label: `line ${l.id}`, hint: l.text.slice(0, 40), run: () => { c.select(l.id); if (FILM.VO?.[l.id]) c.seek(FILM.VO[l.id].start); } })),
    ...TABS.map(([id, t]) => ({ label: `open ${t}`, hint: "panel", run: () => show(id) })),
    { label: "zoom in", hint: "+", run: () => setZoom(z * 1.25) }, { label: "zoom out", hint: "-", run: () => setZoom(z / 1.25) }, { label: "zoom to fit", hint: "0", run: () => setZoom(1) },
    { label: "pick in frame", hint: "P", run: () => setPick(true) }, { label: "undo", hint: "Ctrl Z", run: () => $("btn-undo").click() }, { label: "redo", hint: "Ctrl Shift Z", run: () => $("btn-redo").click() },
    { label: "queue a render", hint: "default options", run: () => api("/__render", {}).then(() => show("renders")).catch((e) => banner(e.message)) },
    { label: "contact sheet", hint: "stills", run: () => $("btn-sheet").click() }, { label: "keyboard shortcuts", hint: "?", run: () => help.classList.add("on") },
  ];
  let list = [], at = 0;
  const draw = () => { qul.replaceChildren(...list.map((a, i) => h("li", { className: i === at ? "on" : "", onclick: () => run(a) }, a.label, h("small", { textContent: a.hint })))); };
  const refilter = () => { const q = qin.value.toLowerCase().split(/\s+/).filter(Boolean); list = actions().filter((a) => q.every((w) => `${a.label} ${a.hint}`.toLowerCase().includes(w))).slice(0, 30); at = 0; draw(); };
  const run = (a) => { qs.classList.remove("on"); qin.blur(); a.run(); };
  const open = () => { qs.classList.add("on"); qin.value = ""; refilter(); qin.focus(); };
  qin.addEventListener("input", refilter);
  qin.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") at = Math.min(list.length - 1, at + 1); else if (e.key === "ArrowUp") at = Math.max(0, at - 1); else if (e.key === "Enter" && list[at]) return run(list[at]); else if (e.key === "Escape") return qs.classList.remove("on"); else return; e.preventDefault(); draw(); });
  qs.addEventListener("pointerdown", (e) => { if (e.target === qs) qs.classList.remove("on"); });
  addEventListener("keydown", (e) => {
    const typing = e.target.closest?.("input,textarea,select");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") { e.preventDefault(); show(secs.props.hidden ? "props" : "inspector"); }
    else if (e.key === "Escape") { qs.classList.remove("on"); help.classList.remove("on"); setPick(false); }
    else if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key === "+" || e.key === "=") setZoom(z * 1.25); else if (e.key === "-") setZoom(z / 1.25); else if (e.key === "0") setZoom(1);
      else if (e.key.toLowerCase() === "p") setPick(!pick.classList.contains("on")); else if (e.key === "?") help.classList.toggle("on");
    }
  });

  // live: the queue and finished writes arrive over SSE
  new EventSource("/__events").addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.queue) { queue = m.queue; drawQueue(); } if (m.job) hist(); });
  const start = store.get("studio:tab"); show(TABS.some(([k]) => k === start) ? start : "inspector");
}
