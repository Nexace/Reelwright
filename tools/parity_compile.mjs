#!/usr/bin/env node
// Compiles docs/PARITY.md from docs/parity/*.md and docs/plans/phase-10z-exceptions-proposed.md.
// Deterministic, no deps: `node tools/parity_compile.mjs [--date YYYY-MM-DD] [--check]`.
// Classification only: it never decides an exception, it groups the rows that are not EQUAL/BETTER by the
// reason their own text gives (or "not done, no stated reason") for the owner to rule on.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARITY_DIR = path.join(ROOT, 'docs/parity');
const OUT_PARITY = path.join(ROOT, 'docs/PARITY.md');
const OUT_EXC = path.join(ROOT, 'docs/plans/phase-10z-exceptions-proposed.md');

const SOURCES = [
  { key: 'hyperframes', title: 'HyperFrames' },
  { key: 'remotion', title: 'Remotion + its skills' },
  { key: 'manim', title: 'Manim CE + ManimGL + manim skills' },
  { key: 'doodle-shots-motion', title: 'anidoodle, video-shotcraft, motion-design-skill, GSAP, Lottie' },
  { key: 'higgsfield-workflows', title: 'Higgsfield workflows (docusphere, cth9191)' },
];
const STATUSES = ['EQUAL', 'BETTER', 'EQUAL/BETTER', 'PARTIAL', 'MISSING', 'OUT', 'N/A', 'OTHER'];
const GOOD = new Set(['EQUAL', 'BETTER', 'EQUAL/BETTER']);

// ---- markdown table parsing -------------------------------------------------------------------------------
// Split a table line into cells. A pipe is a separator unless it is escaped (\|) or inside a `code span`
// (some Remotion rows have `--props file.json|'{...}'`).
function splitRow(line) {
  const cells = [];
  let cur = '', tick = false;
  for (let i = 1; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '`') tick = !tick;
    if (c === '|' && !tick) { cells.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) cells.push(cur.trim());
  return cells;
}
const isSep = (l) => /^\|[\s:|-]+\|?\s*$/.test(l);

// Status word at the start of the status cell. Order matters (longest first).
const LEADS = [
  [/^EQUAL\/BETTER\b/, 'EQUAL/BETTER'],
  [/^BETTER\/N-?A\b/, 'BETTER'],
  [/^BETTER\b/, 'BETTER'],
  [/^EQUAL\b/, 'EQUAL'],
  [/^PARTIAL\b/, 'PARTIAL'],
  [/^MISSING\b/, 'MISSING'],
  [/^OUT\b/, 'OUT'],
  [/^UNVERIFIED\b/, 'OTHER'],
  [/^DIFFERENT\b/, 'OTHER'],
  [/^(N\/A|N-A|n\/a)(?![A-Za-z])/, 'N/A'],
];

function classify(raw) {
  const s = raw.replace(/\*\*/g, '').trim();
  for (const [re, st] of LEADS) {
    const m = s.match(re);
    if (!m) continue;
    const text = s.slice(m[0].length).replace(/^[:.\s,;-]+/, '');
    const label = m[0];
    // The status cell says EQUAL/BETTER but also names a MISSING/PARTIAL piece: count it as PARTIAL, flag it.
    const mixed = GOOD.has(st) && /\b(MISSING|PARTIAL)\b/.test(s.slice(m[0].length));
    return { status: mixed ? 'PARTIAL' : st, lead: s.slice(0, 40), mixed, text: s };
  }
  return null;
}

const clean = (s) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

function parseSource(key) {
  const file = path.join(PARITY_DIR, key + '.md');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const rows = [], skipped = [], bad = [];
  let hdr = null, sec = '', group = '', gi = 0, n = 0, prev = null;
  lines.forEach((line, i) => {
    const ln = i + 1;
    const h = line.match(/^#{2,3}\s+(\d+(?:\.\d+)?[a-z]?)[.:\s]/);
    if (h) { sec = h[1]; n = 0; }
    if (!line.startsWith('|')) { if (line.trim()) hdr = hdr; return; }
    if (isSep(line)) return;
    const cells = splitRow(line);
    const lower = cells.map((c) => c.toLowerCase());
    if (lower.some((c) => /^reelwright 0\.2/.test(c))) { // header row: read the column layout from it
      hdr = {
        n: cells.length,
        id: lower[0] === '#' ? 0 : -1,
        feat: lower.findIndex((c) => /^(feature|card)/.test(c)),
        status: lower.findIndex((c) => /^reelwright 0\.2/.test(c)),
        appr: lower.findIndex((c) => /^approach/.test(c)),
        lic: lower.findIndex((c) => /^licence/.test(c)),
      };
      if (key === 'manim') { group = ''; gi = 0; }
      return;
    }
    if (!hdr) return;
    // A row may lack its trailing licence/effort cells (a few audit rows do); extra cells are a parse error.
    if (cells.length < hdr.n && cells.length > Math.max(hdr.status, hdr.appr)) while (cells.length < hdr.n) cells.push('');
    if (cells.length !== hdr.n) { bad.push({ ln, why: `${cells.length} cells, header has ${hdr.n}`, text: line.slice(0, 80) }); return; }
    const feature = clean(cells[hdr.feat]);
    const stRaw = cells[hdr.status] || '';
    // Group/section rows: no status cell (manim "**Scene model**", hyperframes "| | **A. ...** |").
    if (!stRaw.trim()) {
      if (/^\*\*/.test(cells[hdr.feat])) { group = feature; gi++; n = 0; }
      else bad.push({ ln, why: 'empty status', text: line.slice(0, 80) });
      return;
    }
    const idRaw = hdr.id === 0 ? cells[0] : '';
    n++;
    let id = idRaw || (key === 'manim' ? `m${gi}.${n}` : `${sec}.${n}`);
    if (/^pointer row/.test(stRaw)) { skipped.push({ id, ln, feature, why: clean(stRaw) }); return; }
    let c;
    if (/^same row/.test(stRaw) && prev) c = { ...prev.c, inherited: prev.id };
    else c = classify(stRaw);
    if (!c) { bad.push({ ln, why: 'no status word', text: clean(stRaw).slice(0, 80) }); return; }
    const row = {
      source: key, id, ln, section: group || sec, feature,
      status: c.status, mixed: !!c.mixed, inherited: c.inherited || '',
      statusText: c.text, approach: hdr.appr >= 0 ? clean(cells[hdr.appr] || '') : '',
      licence: hdr.lic >= 0 ? clean(cells[hdr.lic] || '') : '',
    };
    prev = { id, c };
    rows.push(row);
  });
  return { key, rows, skipped, bad };
}

// ---- reasons (exceptions grouping) ------------------------------------------------------------------------
// First match wins. Rules read only what the row itself says: feature + status cell (and the licence cell for
// the licence group). The approach column is not searched, except for a few distinctive tool names, because it
// mentions optional renderers and licences in passing. A row no rule matches is "Not done, no stated reason".
const ST = (r) => `${r.feature} ${r.statusText}`;
const REASONS = [
  { id: 'owner', title: 'Excluded by owner decision or repo rule',
    blurb: 'Rows marked OUT (no cloud render, with Colab staying; no HeyGen accounts, paid or closed-source desktop app; no MCP/plugin packaging), and rows whose status text cites the owner decision or the repo rule.',
    test: (r) => r.status === 'OUT' || /owner: no cloud|repo rule|HeyGen sign-in/i.test(r.statusText) },
  { id: 'hardware', title: 'Needs WebGPU / specific hardware',
    blurb: 'Plan "Known exceptions": WebGPU blocks are supported only where the machine has WebGPU, flagged otherwise. Rows whose feature or status text names WebGPU or a hardware adapter.',
    // feature head = text before the first ":", "(" or ",", so a WebGPU effect buried in a long list does not count
    test: (r) => /WebGPU|TypeGPU|hardware adapter/i.test(r.statusText) || /WebGPU|TypeGPU/i.test(r.feature.split(/[:(,]/)[0]) },
  { id: 'licence', title: 'Licence-blocked or non-OSI (and what was done instead)',
    blurb: 'Rows whose status text or licence cell says the upstream is UNLICENSED, has no licence, is all-rights-reserved, not open source, or a paid licence. The row text says what was done instead (native rewrite, skip).',
    test: (r) => /UNLICENSED|no licen[cs]e|all rights reserved|not open source|paid licen[cs]e|licen[cs]e UNVERIFIED/i.test(r.statusText)
      || (/UNLICENSED/.test(r.licence) && /effects|presentation|shader/i.test(r.feature)) },
  { id: 'seek', title: 'Not seekable / not deterministic, so kept out by the seekable gate',
    blurb: 'Rows whose status text says the upstream feature is interactive, wall-clock or random, and is banned or excluded because Reelwright films must be pure functions of t.',
    test: (r) => /non-seekable|not seekable|banned by the|Math\.random every|qa forbids/i.test(r.statusText) || /non-det/.test(r.feature) },
  { id: 'optional', title: 'Optional renderer / install not bundled (Remotion, Manim CE, ManimGL)',
    blurb: 'Plan: Remotion, Manim CE and ManimGL are opt-in installs, never bundled. Rows whose status text puts the gap in the optional renderer or says it was not built there.',
    test: (r) => (r.source === 'remotion' || r.source === 'manim') && /ManimGL|GL-only|optional renderer|not bundled|not built in 10i|Remotion'?s own|no React Three Fiber/i.test(ST(r))
      || (r.source === 'remotion' && /\[R\] only|Remotion'?s Chrome/.test(r.approach)) },
  { id: 'social', title: 'shotcraft audio, social publishing, JianYing and third-party tools skipped',
    blurb: 'Plan "Known exceptions": JianYing export, Upload-Post publishing, Freesound tool and the Mixkit/untraceable shotcraft audio.',
    test: (r) => /JianYing|Upload-Post|Freesound|Mixkit|untraceable/i.test(`${ST(r)} ${r.approach}`) },
  { id: 'paid', title: 'Paid-connector-only (Higgsfield)',
    blurb: 'Rows from the Higgsfield audit whose status or approach says the capability (generated media, AI music, cloned voices) needs the paid Higgsfield connector (docs/CONNECTORS.md). Core stays free, local and offline.',
    test: (r) => r.source === 'higgsfield-workflows' && /Higgsfield|paid|\bgen\b|connector/i.test(`${ST(r)} ${r.approach}`) },
  { id: 'skip', title: "The audit's own approach column says skip / defer / not needed",
    blurb: 'PARTIAL / MISSING rows whose approach column starts with skip, defer, n/a or none, or says "skip" for the hard part. The audit itself proposes not doing these; the reason is in the approach text.',
    test: (r) => /^(skip|defer|do not|n\/a|none\b)/i.test(r.approach.trim()) || /= skip|skip natively|skip live/i.test(r.approach) },
  { id: 'na', title: 'Not applicable by design (N/A, UNVERIFIED, DIFFERENT)',
    blurb: 'Rows the audit marks n/a, UNVERIFIED or DIFFERENT. Not a gap in the usual sense; the owner confirms they can be dropped from the checklist (or, for UNVERIFIED, tested).',
    test: (r) => r.status === 'N/A' || r.status === 'OTHER' },
  { id: 'todo', title: 'Not done, no stated reason',
    blurb: 'PARTIAL / MISSING rows whose own text gives none of the reasons above.',
    test: () => true },
];
const reasonOf = (r) => REASONS.find((g) => g.test(r)).id;

// Owner ruling 2026-11-12: every row in reason groups 1-9 is a permanent exception; the "todo" group (and the rows the
// audit marked mixed) stay open. Exception: these four Higgsfield rows were moved into group 7 after the ruling (owner
// dropped checkpoint 10l on 2026-11-09), so they are proposed and wait for the owner's yes.
const APPROVED_ON = '2026-11-12';
const PENDING_OWNER = new Set(['higgsfield-workflows:11', 'higgsfield-workflows:13', 'higgsfield-workflows:17', 'higgsfield-workflows:23']);
const stateOf = (r) => (GOOD.has(r.status) ? 'good' : reasonOf(r) === 'todo' ? 'open' : PENDING_OWNER.has(`${r.source}:${r.id}`) ? 'proposed' : 'approved');
const reasonTitle = (r) => REASONS.find((g) => g.id === reasonOf(r)).title;

// What the approach column says is still to do, for sub-grouping the to-do list.
const KINDS = [
  ['Docs / PLAYBOOK note only', /^(\[D\]|R\d\s+docs|docs\b)/i],
  ['Recipe or KIT helper to add (R-tier)', /^R\d\b/],
  ['Native code to add in tools/ (or a flag/command)', /^(\[N\]|native|add\b|port\b|expose|copy|ffmpeg|validate|~~)/i],
  ['Vendor a library', /^(vendor|\[V\])/i],
  ['Optional renderer path ([R])', /^\[R\]/],
  ['Points at another row', /^(see|follows?|link to|E-row)/i],
];
const kindOf = (r) => (KINDS.find(([, re]) => re.test(r.approach.trim())) || ['Other (read the approach text)'])[0];

// ---- output helpers -----------------------------------------------------------------------------------------
// OTHER rows show their own word (UNVERIFIED, DIFFERENT); mixed rows say so.
const shown = (r) => (r.status === 'OTHER' ? r.statusText.split(/[\s:,]/)[0] : r.status) + (r.mixed ? ' (mixed)' : '');
const trim = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const esc = (s) => s.replace(/\|/g, '\\|');
const PROOF_RE = /`?((?:tools|docs|vendor|themes|bin|hf|projects|cloud|studio)\/[\w./*{},-]+)`?/;
function noteOf(r) {
  // status text minus the leading status word, trimmed
  const t = r.statusText.replace(/^(EQUAL\/BETTER|BETTER\/N-?A|BETTER|EQUAL|PARTIAL|MISSING|OUT|UNVERIFIED|DIFFERENT|N\/A|N-A|n\/a|same row)/, '').replace(/^[:.\s,;-]+/, '');
  return r.inherited ? `same as ${r.inherited}` : t;
}
const proofOf = (r) => (r.statusText.match(PROOF_RE) || [])[1] || '';

function build() {
  const data = SOURCES.map((s) => ({ ...s, ...parseSource(s.key) }));
  const all = data.flatMap((d) => d.rows);
  const count = (rows) => Object.fromEntries(STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length]));
  return { data, all, count };
}

function latestDate() {
  const ms = SOURCES.map((s) => fs.statSync(path.join(PARITY_DIR, s.key + '.md')).mtimeMs);
  return new Date(Math.max(...ms)).toISOString().slice(0, 10);
}

function renderParity({ data, count }, date) {
  const L = [];
  L.push('# Reelwright parity with HyperFrames and the nine audited repos', '');
  L.push('<!-- Generated by tools/parity_compile.mjs from docs/parity/*.md. Do not hand-edit: change the rows in docs/parity/ and re-run `node tools/parity_compile.mjs`. -->', '');
  L.push(`Compiled ${date} from the five per-source checklists in [docs/parity/](parity/). One row per audited feature; the status is the word at the start of the row's status cell. See [the Phase 10 plan](plans/phase-10-parity.md) for the goal and the per-source audit notes.`, '');
  L.push('**Legend.** EQUAL: Reelwright does it as well. BETTER: Reelwright does it better. EQUAL/BETTER: the row says both. PARTIAL: some of it. MISSING: not there. OUT: excluded by owner decision or repo rule. N/A: the row says not applicable. OTHER: UNVERIFIED or DIFFERENT. A row marked EQUAL/BETTER whose own text also names a MISSING or PARTIAL piece is counted PARTIAL and tagged `(mixed)`.', '');
  L.push('## Summary', '');
  L.push(`| Source | ${STATUSES.join(' | ')} | Total |`, `|---|${STATUSES.map(() => '--:').join('|')}|--:|`);
  const tot = Object.fromEntries(STATUSES.map((s) => [s, 0])); let T_ = 0;
  for (const d of data) {
    const c = count(d.rows);
    L.push(`| ${d.title} | ${STATUSES.map((s) => c[s]).join(' | ')} | ${d.rows.length} |`);
    for (const s of STATUSES) tot[s] += c[s];
    T_ += d.rows.length;
  }
  L.push(`| **All** | ${STATUSES.map((s) => `**${tot[s]}**`).join(' | ')} | **${T_}** |`, '');
  const good = tot.EQUAL + tot.BETTER + tot['EQUAL/BETTER'];
  const allRows = data.flatMap((d) => d.rows), nOf = (k) => allRows.filter((r) => stateOf(r) === k).length;
  L.push(`${good} of ${T_} rows are EQUAL, BETTER or EQUAL/BETTER; ${T_ - good} are not: **${nOf('approved')} approved exceptions** (owner, ${APPROVED_ON}), **${nOf('proposed')} proposed exceptions** waiting for the owner, and **${nOf('open')} open** (not done, no stated reason).`, '');
  for (const d of data) {
    L.push(`## ${d.title}`, '', `Source: [docs/parity/${d.key}.md](parity/${d.key}.md). ${d.rows.length} rows.`, '');
    L.push('| ID | Feature | Status | Proof or note |', '|---|---|---|---|');
    for (const r of d.rows) {
      const st = shown(r) + (stateOf(r) === 'approved' ? ` — exception (owner-approved ${APPROVED_ON})` : stateOf(r) === 'proposed' ? ' — proposed exception' : '');
      const proof = proofOf(r);
      const note = trim(noteOf(r), 110);
      L.push(`| ${esc(r.id)} | ${esc(trim(r.feature, 70))} | ${st} | ${esc(proof ? `\`${proof}\`` + (GOOD.has(r.status) ? '' : ` ${note}`) : note)} |`);
    }
    L.push('');
  }
  L.push('## Exceptions', '');
  L.push(`Counts: ${good} EQUAL/BETTER, ${nOf('approved')} approved exceptions, ${nOf('proposed')} proposed exceptions (waiting for the owner), ${nOf('open')} open. Only the owner approves an exception; nothing in this file or the script decides one. The full text of every non-EQUAL row, grouped by reason, is in [docs/plans/phase-10z-exceptions-proposed.md](plans/phase-10z-exceptions-proposed.md).`, '');
  const exc = allRows.filter((r) => ['approved', 'proposed'].includes(stateOf(r)));
  for (const g of REASONS.filter((x) => x.id !== 'todo')) {
    const rs = exc.filter((r) => reasonOf(r) === g.id);
    if (!rs.length) continue;
    L.push(`### ${g.title} (${rs.length})`, '');
    for (const r of rs) L.push(`- \`${r.source}:${r.id}\` — ${trim(r.feature, 100)} — ${shown(r)} — ${stateOf(r) === 'approved' ? `exception (owner-approved ${APPROVED_ON})` : 'proposed exception, awaiting the owner'}`);
    L.push('');
  }
  L.push(`### Open (${nOf('open')})`, '', 'Not exceptions: the row is not EQUAL/BETTER and gives no reason. They stay open until the checkpoint that shipped the feature re-audits the row and flips it with a proving file. IDs are in the "Not done, no stated reason" group of [docs/plans/phase-10z-exceptions-proposed.md](plans/phase-10z-exceptions-proposed.md).', '');
  return L.join('\n');
}

function renderExceptions({ data, all }, date) {
  const L = [];
  const notGood = all.filter((r) => !GOOD.has(r.status));
  const groups = REASONS.map((g) => ({ ...g, rows: notGood.filter((r) => reasonOf(r) === g.id) }));
  const line = (r) => `- \`${r.source}:${r.id}\` — ${trim(r.feature, 140)} — ${shown(r)}${stateOf(r) === 'proposed' ? ' — PROPOSED (awaiting the owner)' : stateOf(r) === 'approved' ? ` — exception (owner-approved ${APPROVED_ON})` : ''}`;
  const why = (r) => {
    const n = trim(noteOf(r), 220);
    return n ? `\n  - says: ${n}` : '';
  };
  const gap = (r) => (r.approach ? `\n  - approach: ${trim(r.approach, 200)}` : '');
  L.push('# Phase 10z: non-EQUAL rows, grouped by reason', '');
  L.push(`Generated ${date} by tools/parity_compile.mjs from docs/parity/*.md. Do not hand-edit. **Owner ruling 2026-11-12: groups 1-9 are permanent exceptions (except the rows tagged "proposed", which are waiting for the owner); the last group is open work, not exceptions.** This is every row whose status is not EQUAL, BETTER or EQUAL/BETTER, grouped by the reason the row's own text (or the plan's Known exceptions) gives. The last group, "Not done, no stated reason", is the to-do list.`, '');
  const eq = all.filter((r) => GOOD.has(r.status)).length;
  L.push(`Total rows ${all.length}; EQUAL + BETTER + EQUAL/BETTER ${eq}; not ${notGood.length} (grand total of the groups below: ${groups.reduce((a, g) => a + g.rows.length, 0)}).`, '');
  L.push('| # | Group | Rows |', '|--:|---|--:|');
  groups.forEach((g, i) => L.push(`| ${i + 1} | ${g.title} | ${g.rows.length} |`));
  L.push(`| | **Grand total** | **${notGood.length}** |`, '');
  L.push('Row format: `source:id — feature — status`, then what the row says (status text) and, for open items, its approach column. IDs: HyperFrames and Higgsfield use the source ids; the other sources use `<section>.<n>` (Manim `m<group>.<n>`), numbering the data rows of that section in file order.', '');
  L.push('How rows are grouped: a row goes to the first group whose keyword rule matches what the row itself says (feature, status text, and for some groups the approach or licence cell); anything unmatched is in the last group. The rules are in `REASONS` in tools/parity_compile.mjs. The grouping is a reading aid, not a ruling: read the quoted text. A row with `(mixed)` was written EQUAL or BETTER but its own text also names a MISSING or PARTIAL piece, so it is counted PARTIAL. Rows the audit marked `same row` inherit the status of the row above.', '');
  groups.forEach((g, i) => {
    const nApp = g.rows.filter((r) => stateOf(r) === 'approved').length, nProp = g.rows.filter((r) => stateOf(r) === 'proposed').length;
    L.push(`## ${i + 1}. ${g.title} (${g.rows.length})${g.id === 'todo' ? ' — OPEN, not exceptions' : ` — ${nApp} exception${nApp === 1 ? '' : 's'} (owner-approved ${APPROVED_ON})${nProp ? `, ${nProp} proposed (awaiting the owner)` : ''}`}`, '', g.blurb, '');
    if (g.id === 'todo') {
      L.push(`**These ${g.rows.length} rows are the honest to-do list: not done, and the row gives no reason.** They are not proposed as exceptions; they are open work.`, '');
    }
    const bySrc = SOURCES.map((s) => ({ s, rows: g.rows.filter((r) => r.source === s.key) })).filter((x) => x.rows.length);
    if (!g.rows.length) { L.push('(none)', ''); return; }
    const sub = (title, rows) => {
      L.push(`### ${title} (${rows.length})`, '');
      for (const r of rows) L.push(line(r) + why(r) + gap(r));
      L.push('');
    };
    L.push('By source: ' + bySrc.map((x) => `${x.s.key} ${x.rows.length}`).join(', '), '');
    for (const { s, rows } of bySrc) {
      if (g.id !== 'todo') { sub(s.title, rows); continue; }
      // To-do list: sub-group by what the row's approach column says is still missing.
      const buckets = new Map([...KINDS.map(([k]) => k), 'Other (read the approach text)'].map((k) => [k, []]));
      for (const r of rows) buckets.get(kindOf(r)).push(r);
      L.push(`### ${s.title} (${rows.length})`, '');
      for (const [k, rs] of buckets) {
        if (!rs.length) continue;
        L.push(`#### ${k} (${rs.length})`, '');
        for (const r of rs) L.push(line(r) + why(r) + gap(r));
        L.push('');
      }
    }
  });
  return L.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const di = args.indexOf('--date');
  const date = di >= 0 ? args[di + 1] : latestDate();
  const b = build();
  const problems = b.data.flatMap((d) => [...d.bad.map((x) => `${d.key}:${x.ln} ${x.why}: ${x.text}`)]);
  if (problems.length) console.error('Unparsed rows:\n' + problems.join('\n'));
  fs.writeFileSync(OUT_PARITY, renderParity(b, date));
  fs.writeFileSync(OUT_EXC, renderExceptions(b, date));
  for (const d of b.data) console.error(`${d.key}: ${d.rows.length} rows, ${d.skipped.length} skipped (${d.skipped.map((s) => s.id).join(',')}), ${d.bad.length} unparsed`);
  const c = b.count(b.all);
  const good = c.EQUAL + c.BETTER + c['EQUAL/BETTER'];
  console.error(`total ${b.all.length}, EQUAL+BETTER+EQUAL/BETTER ${good}, not ${b.all.length - good}`);
  if (problems.length) process.exitCode = 1;
}
main();
