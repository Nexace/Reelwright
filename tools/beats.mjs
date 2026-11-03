// Beat-sheet CSV / timeline JSON <-> project.json (`reelwright beats`). No dependencies.
// Import: lines[i] = {id, text, gap} from Beat Label + VO Script; everything else is kept in project.beats so
// export can write the sheet back. Unknown columns are kept in beats[i].raw and never used or sent anywhere.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const HEADER_NEW = ["Scene", "Beat Label", "VO Script", "VO Length", "Clip Duration", "SHOT", "MOTION", "TEXT ON SCREEN", "SFX", "IMG PROMPT", "VID PROMPT"];
export const HEADER_OLD = ["Scene", "Beat Label", "VO Script", "VO Length", "Clip Duration", "SHOT", "MOTION", "TEXT ON SCREEN", "AUDIO", "Source", "Status"];
// column (lower-case) -> field on a beats[] entry; anything else goes to raw[<header as written>]
const FIELD = { "scene": "scene", "beat label": "label", "vo length": "target", "clip duration": "clip", "shot": "shot",
  "motion": "motion", "text on screen": "onScreen", "sfx": "sfx" };

// RFC 4180: quoted fields, "" escapes, newlines inside quotes, CRLF or LF. Skips fully blank rows.
export function parseCSV(text) {
  const rows = []; let row = [], f = "", q = false, i = 0;
  if (text.charCodeAt(0) === 0xfeff) i = 1;
  const endRow = () => { row.push(f); f = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; };
  for (; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c !== '"') f += c; else if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
    else if (c === '"' && f === "") q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; endRow(); }
    else f += c;
  }
  if (q) throw new Error("CSV: unterminated quoted field");
  if (f !== "" || row.length) endRow();
  return rows;
}
export const toCSV = (rows) => rows.map((r) => r.map((v) => /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(",")).join("\r\n") + "\r\n";

const num = (s) => (s !== "" && Number.isFinite(+s) && String(+s) === s ? +s : s);   // 6 stays 6, "6.0" stays "6.0"
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function beatsFromCSV(text) {
  const [head, ...rows] = parseCSV(text);
  if (!head) throw new Error("CSV is empty");
  const col = head.map((h) => h.trim()), low = col.map((h) => h.toLowerCase());
  if (!low.includes("vo script")) throw new Error(`CSV has no "VO Script" column (header: ${col.join(",")})`);
  const beats = [], texts = [];
  rows.forEach((r) => {
    const b = { raw: {} };
    col.forEach((h, k) => {
      const v = r[k] ?? "", fld = FIELD[low[k]];
      if (low[k] === "vo script") texts.push(v);
      else if (fld) b[fld] = fld === "target" || fld === "clip" ? num(v) : v;
      else b.raw[h] = v;
    });
    beats.push(b);
  });
  return { header: col, beats, texts };
}

const hasAny = (p, ks) => ks.filter((k) => p[k] != null && !(Array.isArray(p[k]) && !p[k].length));
const needReplace = (p, ks, replace) => { const h = hasAny(p, ks); if (h.length && !replace) throw new Error(`project already has ${h.join(", ")}; pass --replace to overwrite (extra fields of lines with the same id are kept)`); };

export function importCSV(p, text, { replace = false } = {}) {
  needReplace(p, ["lines", "beats", "beatsHeader"], replace);
  const { header, beats: all, texts: allT } = beatsFromCSV(text), seen = new Set(), skipped = [];
  const keep = allT.map((t, i) => (t.trim() ? i : (skipped.push(all[i].scene || i + 1), -1))).filter((i) => i >= 0);
  const beats = keep.map((i) => all[i]), texts = keep.map((i) => allT[i]);
  const old = new Map((p.lines || []).map((l) => [l.id, l]));
  p.lines = texts.map((t, i) => {
    const b = beats[i]; let id = slug(b.label || "") || `s${b.scene || i + 1}`, n = 2;
    for (const base = id; seen.has(id); n++) id = `${base}-${n}`;
    seen.add(id);
    const o = old.get(id) || {};
    return { id, gap: i ? 0.8 : 0.0, ...o, text: t };   // matching old line keeps gap, langs, custom keys
  });
  const dropped = [...old.keys()].filter((id) => !seen.has(id)), added = [...seen].filter((id) => !old.has(id));
  p.beats = beats; p.beatsHeader = header;
  let msg = `${p.lines.length} lines + beats from CSV (columns: ${header.join(", ")})`;
  if (old.size) msg += `\n  kept (same id): ${[...seen].filter((id) => old.has(id)).join(", ") || "none"}\n  dropped: ${dropped.join(", ") || "none"}\n  added: ${added.join(", ") || "none"}`;
  if (skipped.length) msg += `\n  WARNING: skipped rows with empty VO Script (Scene ${skipped.join(", ")})`;
  return { msg, keys: ["lines", "beats", "beatsHeader"] };
}

export function importTimeline(p, text, { replace = false } = {}) {
  needReplace(p, ["beats", "beatsHeader"], replace);
  const tl = JSON.parse(text).timeline;
  if (!Array.isArray(tl)) throw new Error('JSON needs { "timeline": [{ "start_s", "end_s", "label" }] }');
  p.beats = tl.map((s, i) => ({ scene: String(i + 1), label: s.label ?? "", target: +(s.end_s - s.start_s).toFixed(3), raw: {} }));
  return { msg: `${p.beats.length} beat sections from timeline[] (label + target seconds; lines untouched)`, keys: ["beats"] };
}

// Top-level members of a JSON object text: key -> [value start, value end, key start]. Strings and nesting are skipped.
export function topSpans(t) {
  const out = {}; let d = 0, i = 0, key = null, ks = 0, vs = -1, ve = 0;
  while (i < t.length) {
    const c = t[i];
    if (d === 1 && key !== null && vs < 0 && !/[\s:]/.test(c)) vs = i;
    if (c === '"') {
      const s = i; for (i++; t[i] !== '"'; i += t[i] === "\\" ? 2 : 1); i++;
      if (d === 1 && key === null) { key = JSON.parse(t.slice(s, i)); ks = s; vs = -1; } else if (d === 1) ve = i;
      continue;
    }
    if (c === "{" || c === "[") d++;
    else if (c === "}" || c === "]") { d--; if (d === 1) ve = i + 1; else if (d === 0 && key !== null) { out[key] = [vs, ve, ks]; key = null; } }
    else if (d === 1 && key !== null && !/[\s:,]/.test(c)) ve = i + 1;
    else if (d === 1 && c === "," && key !== null) { out[key] = [vs, ve, ks]; key = null; }
    i++;
  }
  return out;
}
const compact = (o) => "{ " + Object.entries(o).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(", ") + " }";
const ser = (v) => (Array.isArray(v) && v.length && typeof v[0] === "object" ? "[\n" + v.map((x) => "    " + compact(x)).join(",\n") + "\n  ]" : JSON.stringify(v));

// Write only `keys` of p into the original JSON text; every other byte stays as it was.
export function splice(text, p, keys) {
  const sp = topSpans(text), edits = []; let add = "";
  let end = Math.max(...Object.values(sp).map((x) => x[1]));
  for (const k of keys) {
    if (sp[k]) edits.push([sp[k][0], sp[k][1], ser(p[k])]);
    else add += `,\n  ${JSON.stringify(k)}: ${ser(p[k])}`;
  }
  if (add) edits.push([end, end, add]);
  return edits.sort((x, y) => y[0] - x[0]).reduce((t, [a, b, r]) => t.slice(0, a) + r + t.slice(b), text);
}

export function exportCSV(p) {
  const header = p.beatsHeader || HEADER_NEW, lines = p.lines || [], beats = p.beats || [];
  const out = [header];
  for (let i = 0; i < Math.max(lines.length, beats.length); i++) {
    const b = beats[i] || { raw: {} }, l = lines[i];
    out.push(header.map((h) => {
      const k = h.toLowerCase();
      if (k === "vo script") return l?.text ?? "";
      if (k === "scene") return String(b.scene ?? i + 1);
      if (k === "beat label") return b.label ?? l?.id ?? "";
      const fld = FIELD[k];
      return String(fld ? b[fld] ?? "" : b.raw?.[h] ?? "");
    }));
  }
  return toCSV(out);
}

function selfCheck() {
  const assert = (c, m) => { if (!c) throw new Error("beats self-check: " + m); };
  const tricky = 'a,"b ""q"" c","l1\nl2"\r\n\r\n"",x,\r\n';
  const r = parseCSV(tricky);
  assert(r.length === 2 && r[0][1] === 'b "q" c' && r[0][2] === "l1\nl2" && r[1].join("|") === "|x|", "parse");
  assert(toCSV(parseCSV(toCSV(r))).length > 0 && JSON.stringify(parseCSV(toCSV(r))) === JSON.stringify(r), "csv round trip");
  for (const H of [HEADER_NEW, HEADER_OLD]) {
    const rows = [H, ["1", "The Deal", 'Say "hi", ok\nnew line', "5.0", "6", "s", "m", "T", "x", "u,v", "w"],
      ["2", "The Deal", "Two", "", "", "", "", "", "", "", ""], ["3", "", "Three", "3", "4", "", "", "", "", "", ""]];
    const csv = toCSV(rows), p = {}; importCSV(p, csv);
    assert(p.lines.map((l) => l.id).join() === "the-deal,the-deal-2,s3", "ids " + p.lines.map((l) => l.id));
    assert(p.beats[0].target === "5.0" && p.beats[0].clip === 6 && p.beats[0].onScreen === "T", "fields");
    assert(exportCSV(p) === csv, "export differs for " + H[8]);
    let threw = false; try { importCSV(p, csv); } catch { threw = true; }
    assert(threw, "no refuse without replace");
  }
  const t = {}; importTimeline(t, '{"timeline":[{"start_s":0,"end_s":2.5,"label":"A"}]}');
  assert(t.beats[0].target === 2.5 && t.beats[0].label === "A", "timeline");
  const proj = fileURLToPath(new URL("../projects/layouts-hf/project.json", import.meta.url));
  if (fs.existsSync(proj)) {
    const orig = fs.readFileSync(proj, "utf8"), q = JSON.parse(orig);
    const x = { id: "k", gap: 0.2, text: "kept", langs: { es: { text: "k" } } };
    q.lines = [x, ...q.lines]; q.lines = q.lines.slice(0, 1); q.beats = [{ label: "L", raw: {} }]; q.beatsHeader = HEADER_NEW;
    const out = splice(orig, q, ["lines", "beats", "beatsHeader"]), a = topSpans(orig), b = topSpans(out);
    assert(JSON.stringify(JSON.parse(out)) === JSON.stringify(q), "splice content");
    for (const k of Object.keys(a)) if (k !== "lines") assert(orig.slice(a[k][2], a[k][1]) === out.slice(b[k][2], b[k][1]), "splice changed " + k);
    assert(/\n    \{ "id": "k", "gap": 0.2, "text": "kept"/.test(out), "compact style");
    const r = { lines: [x] }; importCSV(r, toCSV([HEADER_NEW, ["1", "K", "new text", "", "", "", "", "", "", "", ""], ["2", "Z", "", "", "", "", "", "", "", "", ""]]), { replace: true });
    assert(r.lines.length === 1 && r.lines[0].text === "new text" && r.lines[0].langs && r.lines[0].gap === 0.2, "replace keeps extras, skips empty");
  }
  console.log("beats self-check ok");
}

// CLI body for bin/reelwright.mjs: beats <project> import <file.csv|file.json> [--replace] | export [file]
export function cli(projDir, args) {
  const replace = args.includes("--replace"), [sub, file] = args.filter((a) => !a.startsWith("--")), pj = `${projDir}/project.json`;
  const text = fs.readFileSync(pj, "utf8"), p = JSON.parse(text);
  console.log(`project: ${pj}`);
  if (sub === "import" && file) {
    const src = fs.readFileSync(file, "utf8");
    const { msg, keys } = file.toLowerCase().endsWith(".json") ? importTimeline(p, src, { replace }) : importCSV(p, src, { replace });
    fs.writeFileSync(pj, splice(text, p, keys));
    console.log(msg);
  } else if (sub === "export") {
    const dest = file || `${projDir}/beats.csv`;
    fs.writeFileSync(dest, exportCSV(p));
    console.log(`${dest}: ${Math.max(p.lines?.length || 0, p.beats?.length || 0)} rows, header ${(p.beatsHeader || HEADER_NEW).slice(8).join("/")}`);
  } else throw new Error("usage: beats [project] import <file.csv|file.json> [--replace] | beats [project] export [file.csv]");
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "--self-check") selfCheck();
