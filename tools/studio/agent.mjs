// tools/studio/agent.mjs — remotion:2.8.1: the MCP-free equivalent of Remotion Studio's WebMCP tools (look, select, inspect, set style, frame).
// ONE route on the studio server, POST /__agent { cmd, … }, behind the studio's own checks (127.0.0.1, Host, the studio's Origin, application/json,
// a fixed cmd list, values validated here); `reelwright studio <project> look|inspect|select|set-style|frame|state` (tools/commands/studio.mjs) is its client.
//   frame     { t | frame }                 the agent's playhead; open studio tabs follow it
//   look      { t?, selector?, format? }    a screenshot of the film at t (or of one element's box) → { png | jpeg: base64 }
//   inspect   { selector, t? }              box, text and computed style of the first match, how many matched, the script line it belongs to
//   select    { line | selector | clear }   the agent's selection; open tabs select that line
//   set-style { selector, styles | reset }  an overlay (a stylesheet in the agent's page and in open tabs) that is NOT saved; `persist: true` appends the rule to
//                                           the film's own <style> and only works when the studio runs with --edit-source (undoable like any source write)
//   state     {}                            the above, as one object
// The agent looks through its own headless page (the same file:// page `stills` and `lint` open), so nothing needs a tab open. It never calls a paid
// service, never runs a shell, and writes nothing except a persisted rule through the source writer.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const CMDS = ["frame", "look", "inspect", "select", "set-style", "state"];
const MAX_RULES = 30;
// what an overlay may hold: names and values that cannot close the rule, open a url() or reach outside it
const SEL = /^[^{};<>@\\\0\n]{1,200}$/, PROP = /^(--[\w-]{1,40}|[a-z][a-z-]{0,40})$/, VAL = /^[^{};<>@\\\0\n]{1,200}$/;
const BAD_VAL = /url\s*\(|image-set|expression|javascript:|\bimport\b/i;
const SHOW = ["display", "visibility", "opacity", "position", "z-index", "transform", "color", "background-color", "font-family", "font-size", "font-weight", "line-height",
  "letter-spacing", "text-align", "text-transform", "filter", "mix-blend-mode", "border-radius", "overflow", "clip-path", "width", "height"];

export function agent({ DIR, readProject, isHf, send, editSource, writeSource, busy }) {
  const st = { t: 0, select: null, overlay: [] };   // overlay: [{ selector, styles: { prop: value } }] — in memory only
  let browser = null, page = null, dirty = true, chain = Promise.resolve(), errors = [];
  const fail = (code, error) => Object.assign(new Error(error), { code });
  let dur = null;   // the film's length: the page's window.FILM.DUR (asked once, again after the project changes)
  const durOf = async () => dur ??= await (await ensure()).evaluate(() => window.FILM.DUR);
  const css = () => st.overlay.map((o) => `${o.selector} { ${Object.entries(o.styles).map(([k, v]) => `${k}: ${v} !important`).join("; ")} }`).join("\n");
  const view = () => { const P = readProject(), fps = Number(P.fps || 60); return { project: P.title || path.basename(DIR), t: st.t, frame: Math.round(st.t * fps), fps, dur,
    select: st.select, overlay: st.overlay, editSource, page: isHf(P) ? "hf/index.html" : "film/index.html" }; };

  async function ensure() {   // the film page in a headless browser, fonts loaded, frame 0 drawn; opened again after the project's files change
    if (page && !dirty) return page;
    if (page) { await page.close().catch(() => {}); page = null; }
    const P = readProject(), [W, H] = [P.width || 1920, P.height || 1080];
    try {
      const { launch } = await import("../browser.mjs");
      browser ||= await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
    } catch (e) { throw fail(503, `no browser to look through: ${e.message.split("\n")[0]}`); }
    page = await browser.newPage({ viewport: { width: W, height: H } }); errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(DIR, isHf(P) ? "hf/index.html" : "film/index.html")).href);
    if (!(await page.evaluate(() => window.READY).catch(() => false))) { const m = errors.join("; ") || "READY never resolved"; await page.close().catch(() => {}); page = null; throw fail(503, `the film page failed to load: ${m}`); }
    dirty = false; await paint(); return page;
  }
  const paint = () => page.evaluate((c) => { let s = document.getElementById("__agent-overlay"); if (!s) { s = document.createElement("style"); s.id = "__agent-overlay"; document.head.append(s); } s.textContent = c; }, css());
  async function at(t) { const p = await ensure(); await p.evaluate((x) => window.render(x), t); return p; }

  const num = (v) => typeof v === "number" && Number.isFinite(v);
  async function seekTo(b) {   // → seconds, from t or frame, inside the film
    const P = readProject(), fps = Number(P.fps || 60), dur = await durOf();
    let t = b.t ?? (b.frame != null ? b.frame / fps : st.t);
    if (!num(t) || t < 0 || t > dur + 1e-6) throw fail(400, `t (or frame) is a time inside the film: 0 to ${dur} s`);
    return Math.round(t * fps) / fps;
  }
  const moveTo = (t) => { if (Math.abs(t - st.t) > 1e-9) { st.t = t; send({ agent: { t } }); } };
  const selector = (b) => { if (typeof b.selector !== "string" || !SEL.test(b.selector)) throw fail(400, "selector: a CSS selector of at most 200 characters (no braces, semicolons, @, < > or backslashes)"); return b.selector; };
  const line = (P, text, VO, t) => {   // the script line an element belongs to: the one whose words it holds, else the one spoken at t (as Pick in frame)
    const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim(), n = norm(text || "");
    const hit = n.length >= 3 && (P.lines || []).find((l) => norm(l.text).includes(n) || n.includes(norm(l.text)));
    if (hit) return { id: hit.id, by: "its words" };
    const live = Object.entries(VO || {}).sort((a, b) => a[1].start - b[1].start).find(([, v]) => t <= v.end)?.[0];
    return live ? { id: live, by: "spoken here" } : null;
  };
  async function probe(p, sel, t) {   // → what is at `sel` now
    const r = await p.evaluate((q) => {
      let all; try { all = [...document.querySelectorAll(q.sel)]; } catch (e) { return { bad: e.message }; }
      const el = all[0]; if (!el) return { matches: 0 };
      const b = el.getBoundingClientRect(), s = getComputedStyle(el), style = {}; for (const k of q.show) style[k] = s.getPropertyValue(k);
      const vo = window.FILM && window.FILM.VO || {};
      return { matches: all.length, tag: el.tagName.toLowerCase(), id: el.id || null, classes: typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [],
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160), box: { x: +b.x.toFixed(1), y: +b.y.toFixed(1), width: +b.width.toFixed(1), height: +b.height.toFixed(1) },
        visible: s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0 && +s.opacity > 0, style, inline: el.getAttribute("style") || "", vo: JSON.parse(JSON.stringify(vo)) };
    }, { sel, show: SHOW });
    if (r.bad) throw fail(400, `selector: ${r.bad}`);
    const { vo, ...out } = r; if (out.matches) out.line = line(readProject(), out.text, vo, t);
    return { selector: sel, t, ...out };
  }

  const cmds = {
    state: async () => view(),
    async frame(b) { const t = await seekTo(b); moveTo(t); return view(); },
    async look(b) {
      const t = await seekTo(b), p = await at(t); moveTo(t);
      const fmt = b.format === "jpeg" ? "jpeg" : "png", shot = { type: fmt, ...(fmt === "jpeg" && { quality: 85 }) };
      let box = null;
      if (b.selector !== undefined) {
        const r = await probe(p, selector(b), t);
        if (!r.matches) throw fail(404, `nothing matches ${b.selector} at ${t} s`);
        const v = p.viewportSize(), x = Math.max(0, r.box.x), y = Math.max(0, r.box.y);
        box = { x, y, width: Math.min(v.width - x, r.box.width), height: Math.min(v.height - y, r.box.height) };
        if (!(box.width >= 1 && box.height >= 1)) throw fail(404, `${b.selector} has no visible box at ${t} s`);
        shot.clip = box;
      }
      const buf = await p.screenshot(shot), v = p.viewportSize();
      return { t, frame: view().frame, width: box ? Math.round(box.width) : v.width, height: box ? Math.round(box.height) : v.height, format: fmt, clip: box, [fmt]: buf.toString("base64") };
    },
    async inspect(b) { const sel = selector(b), t = await seekTo(b), p = await at(t); moveTo(t); return probe(p, sel, t); },
    async select(b) {
      if (b.clear === true) { st.select = null; send({ agent: { select: null } }); return view(); }
      if (b.line !== undefined) {
        if (typeof b.line !== "string" || !(readProject().lines || []).some((l) => l.id === b.line)) throw fail(404, `no line "${b.line}" in project.json`);
        st.select = { line: b.line }; send({ agent: { select: b.line } }); return view();
      }
      const r = await cmds.inspect(b);
      if (!r.matches) throw fail(404, `nothing matches ${b.selector} at ${r.t} s`);
      st.select = { selector: b.selector, ...(r.line && { line: r.line.id }) }; if (r.line) send({ agent: { select: r.line.id } });
      return { ...view(), found: r };
    },
    async "set-style"(b) {
      if (b.reset === true) { st.overlay = []; if (page && !dirty) await paint(); send({ agent: { css: "" } }); return view(); }
      const sel = selector(b);
      if (!isObjLike(b.styles) || !Object.keys(b.styles).length || Object.keys(b.styles).length > 20) throw fail(400, "styles: an object of 1 to 20 CSS properties");
      const styles = {};
      for (const [k, v] of Object.entries(b.styles)) {
        if (!PROP.test(k)) throw fail(400, `styles: "${k}" is not a CSS property name`);
        const val = typeof v === "number" ? String(v) : v;
        if (typeof val !== "string" || !VAL.test(val) || BAD_VAL.test(val)) throw fail(400, `styles.${k}: a plain value (no braces, semicolons, url() or @)`);
        styles[k] = val.trim();
      }
      if (b.persist === true) {   // the one write: a rule at the end of the film's own <style>, as a source edit (undo restores it)
        if (!editSource) throw fail(403, "set-style --edit-source writes the film's source: start the studio with --edit-source");
        if (busy()) throw fail(409, "busy: a job is running");
        const rel = isHf(readProject()) ? "hf/index.html" : "film/index.html", f = path.join(DIR, rel), txt = fs.readFileSync(f, "utf8"), i = txt.indexOf("</style>");
        if (i < 0) throw fail(400, `${rel} has no <style> to add the rule to`);
        writeSource(rel, `${txt.slice(0, i)}/* reelwright studio set-style */\n${sel} { ${Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join("; ")} }\n${txt.slice(i)}`);
        return { ...view(), persisted: rel };
      }
      const cur = st.overlay.find((o) => o.selector === sel);
      if (cur) Object.assign(cur.styles, styles); else if (st.overlay.length >= MAX_RULES) throw fail(400, `at most ${MAX_RULES} overlay rules (set-style --reset clears them)`); else st.overlay.push({ selector: sel, styles });
      const p = await ensure(); await paint(); send({ agent: { css: css() } });
      const n = await p.evaluate((q) => { try { return document.querySelectorAll(q).length; } catch { return -1; } }, sel);
      if (n < 0) { st.overlay = st.overlay.filter((o) => o.selector !== sel); await paint(); throw fail(400, "selector: not valid CSS"); }
      return { ...view(), matched: n };
    },
  };
  const isObjLike = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

  return {
    CMDS, css, view,
    invalidate() { dirty = true; dur = null; },   // a project file changed: the next look opens the page again
    // one command at a time: they share one page
    handle(b) {
      if (typeof b.cmd !== "string" || !CMDS.includes(b.cmd)) return Promise.reject(fail(400, `cmd is one of: ${CMDS.join(", ")}`));
      const run = chain.then(() => cmds[b.cmd](b));
      chain = run.catch(() => {});
      return run;
    },
    async close() { try { await browser?.close(); } catch { /* already gone */ } browser = page = null; },
  };
}
