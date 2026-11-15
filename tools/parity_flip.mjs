#!/usr/bin/env node
// node tools/parity_flip.mjs flips.json — [{source,id,status,proof}]: rewrites the status cell of each row in docs/parity/<source>.md
// to "<status> (11): <proof>" (Phase 11 orchestrator tool; then run `node tools/parity_compile.mjs`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource } from './parity_compile.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'parity');
const flips = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
function cellSpans(line) { // [start,end) of each cell between pipes, same rules as parity_compile's splitRow
  const sp = []; let start = 1, tick = false;
  for (let i = 1; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && line[i + 1] === '|') { i++; continue; }
    if (c === '`') tick = !tick;
    if (c === '|' && !tick) { sp.push([start, i]); start = i + 1; }
  }
  if (line.slice(start).trim()) sp.push([start, line.length]);
  return sp;
}
let n = 0; const miss = [];
for (const src of [...new Set(flips.map((f) => f.source))]) {
  const file = path.join(root, src + '.md');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const { rows } = parseSource(src);
  for (const f of flips.filter((f) => f.source === src)) {
    const r = rows.find((r) => r.id === f.id);
    if (!r) { miss.push(`${src}:${f.id}`); continue; }
    const line = lines[r.ln - 1], sp = cellSpans(line);
    const k = sp.findIndex(([a, b]) => line.slice(a, b).replace(/\*\*/g, '').trim().startsWith(r.statusText.slice(0, 30)));
    if (k < 0) { miss.push(`${src}:${f.id} (cell)`); continue; }
    const [a, b] = sp[k];
    lines[r.ln - 1] = line.slice(0, a) + ' ' + `${f.status} (11): ${f.proof}`.replace(/\|/g, '\\|') + ' ' + line.slice(b);
    n++;
  }
  fs.writeFileSync(file, lines.join('\n'));
}
console.log('flipped', n, 'missing', miss.join(', ') || 'none');
