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

export function importCSV(p, text, { replace = false } = {}) {
  if (p.lines?.length && !replace) throw new Error(`project already has ${p.lines.length} lines; pass --replace to overwrite them`);
  const { header, beats, texts } = beatsFromCSV(text), seen = new Set();
  p.lines = texts.map((t, i) => {
    const b = beats[i]; let id = slug(b.label || "") || `s${b.scene || i + 1}`, n = 2;
    for (const base = id; seen.has(id); n++) id = `${base}-${n}`;
    seen.add(id);
    return { id, text: t, gap: i ? 0.8 : 0.0 };
  });
  p.beats = beats; p.beatsHeader = header;
  return `${p.lines.length} lines + beats from CSV (columns: ${header.join(", ")})`;
}

export function importTimeline(p, text, { replace = false } = {}) {
  if (p.beats?.length && !replace) throw new Error(`project already has ${p.beats.length} beats; pass --replace to overwrite them`);
  const tl = JSON.parse(text).timeline;
  if (!Array.isArray(tl)) throw new Error('JSON needs { "timeline": [{ "start_s", "end_s", "label" }] }');
  p.beats = tl.map((s, i) => ({ scene: String(i + 1), label: s.label ?? "", target: +(s.end_s - s.start_s).toFixed(3), raw: {} }));
  return `${p.beats.length} beat sections from timeline[] (label + target seconds; lines untouched)`;
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
  console.log("beats self-check ok");
}

// CLI body for bin/reelwright.mjs: beats <project> import <file.csv|file.json> [--replace] | export [file]
export function cli(projDir, args) {
  const [sub, file] = args, pj = `${projDir}/project.json`, replace = args.includes("--replace");
  const p = JSON.parse(fs.readFileSync(pj, "utf8"));
  if (sub === "import" && file) {
    const text = fs.readFileSync(file, "utf8");
    const msg = file.toLowerCase().endsWith(".json") ? importTimeline(p, text, { replace }) : importCSV(p, text, { replace });
    fs.writeFileSync(pj, JSON.stringify(p, null, 2) + "\n");
    console.log(`${pj}: ${msg}`);
  } else if (sub === "export") {
    const dest = file && !file.startsWith("--") ? file : `${projDir}/beats.csv`;
    fs.writeFileSync(dest, exportCSV(p));
    console.log(`${dest}: ${Math.max(p.lines?.length || 0, p.beats?.length || 0)} rows, header ${(p.beatsHeader || HEADER_NEW).slice(8).join("/")}`);
  } else throw new Error("usage: beats [project] import <file.csv|file.json> [--replace] | beats [project] export [file.csv]");
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "--self-check") selfCheck();
