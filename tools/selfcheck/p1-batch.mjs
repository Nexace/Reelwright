// node tools/selfcheck/p1-batch.mjs — row hyperframes:A6, batch render (tools/commands/batch.mjs).
// 1. rows: JSON and CSV (number/boolean columns read as such), _name, duplicate names, every row checked against the declarations.
// 2. the scheduler with a fake row runner: never more than --concurrency rows at once, a failed row doesn't stop the others,
//    --fail-fast starts no new row after the first failure and stops running ones (signal), statuses ok/failed/cancelled/skipped.
// 3. the real thing on a fixture project (offline, tools/selfcheck/p1-fixture.mjs): `reelwright batch` makes one mp4 per row
//    with that row's variables (pixel-checked), two at a time, batch.json lists them, the source project is left as it was;
//    a bad row stops everything before rendering; a row that fails at render is reported and the rest still render.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { loadVars, readRows, runBatch } from "../commands/batch.mjs";
import { ROOT, DECLS, tmpdir, makeProject, rw, pixel } from "./p1-fixture.mjs";

const V = loadVars(), tmp = tmpdir("batch");

// ── 1. rows ─────────────────────────────────────────────────────────────────
{
  const j = path.join(tmp, "rows.json");
  fs.writeFileSync(j, JSON.stringify([{ _name: "a", title: "A", bars: 2 }, { title: "B" }, { _name: "bad", bars: "x", tone: "mid", ghost: 1 }]));
  const r = readRows(j, DECLS, V);
  assert.deepEqual(r.rows.map((x) => x.name), ["a", "row-2", "bad"], "names: _name, else row-<index>");
  assert.equal(r.rows[0].values.title, "A"); assert.equal(r.rows[0].values.bars, 2); assert.equal(r.rows[1].values.bars, 3, "unset keys keep the default");
  assert.equal(r.problems.length, 1); assert.equal(r.problems[0].name, "bad");
  assert.deepEqual(r.problems[0].issues.map((i) => i.code).sort(), ["undeclared_variable", "variable_enum_out_of_range", "variable_type_mismatch"]);
  assert.equal(readRows(j, DECLS, V, { strict: true }).problems[0].issues.find((i) => i.code === "undeclared_variable").level, "error");

  const c = path.join(tmp, "rows.csv");
  fs.writeFileSync(c, '_name,title,bars,dark,tone\nx,"Hello, world",4,true,loud\ny,Plain,2,0,calm\n');
  const rc = readRows(c, DECLS, V);
  assert.deepEqual(rc.problems, []);
  assert.deepEqual(rc.rows.map((x) => [x.name, x.overrides]), [["x", { title: "Hello, world", bars: 4, dark: true, tone: "loud" }], ["y", { title: "Plain", bars: 2, dark: false, tone: "calm" }]], "csv cells read as the declared type, quotes and commas kept");
  fs.writeFileSync(j, JSON.stringify([{ _name: "same" }, { _name: "same" }, { _name: "../x" }]));
  assert.deepEqual(readRows(j, DECLS, V).problems.flatMap((p) => p.issues.map((i) => i.code)), ["duplicate_row_name", "invalid_row_name"]);
  fs.writeFileSync(j, "[]");
  assert.throws(() => readRows(j, DECLS, V), /non-empty array/);
  console.log("PASS  rows: json, csv with coercion, names, per-row validation");
}

// ── 2. the scheduler ────────────────────────────────────────────────────────
{
  const rows = Array.from({ length: 6 }, (_, i) => ({ name: "r" + i, overrides: { i } }));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let live = 0, peak = 0;
  const ok = async (row) => { peak = Math.max(peak, ++live); await sleep(40); live--; return { out: row.name + ".mp4" }; };
  let r = await runBatch(rows, { concurrency: 2, runRow: ok });
  assert.equal(r.ok, 6); assert.equal(peak, 2, "exactly 2 at once"); assert.equal(r.peak, 2);
  assert.deepEqual(r.rows.map((x) => x.status), Array(6).fill("ok")); assert.equal(r.rows[3].out, "r3.mp4"); assert.deepEqual(r.rows[3].variables, { i: 3 });
  r = await runBatch(rows, { concurrency: 1, runRow: ok });
  assert.equal(r.peak, 1, "default concurrency is one at a time");

  const boom = async (row) => { await sleep(20); if (row.name === "r1") throw new Error("render died"); return { out: "x" }; };
  r = await runBatch(rows, { concurrency: 1, runRow: boom });
  assert.deepEqual(r.rows.map((x) => x.status), ["ok", "failed", "ok", "ok", "ok", "ok"], "default: a failure doesn't stop the batch");
  assert.equal(r.rows[1].error, "render died"); assert.equal(r.failed, 1);

  r = await runBatch(rows, { concurrency: 1, failFast: true, runRow: boom });
  assert.deepEqual(r.rows.map((x) => x.status), ["ok", "failed", "skipped", "skipped", "skipped", "skipped"], "--fail-fast: nothing starts after the first failure");

  let stopped = 0;
  const slow = async (row, signal) => {
    if (row.name === "r0") { await sleep(30); throw new Error("early failure"); }
    await new Promise((res, rej) => { const t = setTimeout(res, 5000); signal.addEventListener("abort", () => { clearTimeout(t); stopped++; rej(new Error("stopped")); }); });
    return {};
  };
  r = await runBatch(rows, { concurrency: 3, failFast: true, runRow: slow });
  assert.deepEqual(r.rows.map((x) => x.status), ["failed", "cancelled", "cancelled", "skipped", "skipped", "skipped"]);
  assert.equal(stopped, 2, "the running rows got the abort signal");
  console.log("PASS  scheduler: concurrency cap, continue on failure, --fail-fast skips and cancels");
}

// ── 3. the real command ─────────────────────────────────────────────────────
{
  const proj = makeProject(path.join(tmp, "proj")), out = path.join(proj, "out", "batch");
  fs.rmSync(path.join(proj, "hf", "kit-vars.js"));
  const d = rw("batch", proj, "--defaults");   // writes the file a page that loads kit-vars.js needs
  assert.equal(d.status, 0, d.out);
  const kit = fs.readFileSync(path.join(proj, "hf", "kit-vars.js"), "utf8");
  assert.ok(kit.includes('"__hfVariables"') === false && kit.includes('window.__hfVariables={"title":"Default title"'), "defaults file holds every declared default");
  const rowsFile = path.join(tmp, "rows.json");
  fs.writeFileSync(rowsFile, JSON.stringify([{ _name: "blue", accent: "#0000ff", bars: 3 }, { _name: "red", accent: "#ff0000", bars: 3 }, { _name: "plain" }]));

  const chk = rw("batch", proj, rowsFile, "--check");
  assert.equal(chk.status, 0, chk.out); assert.match(chk.out, /3 row\(s\) valid/); assert.ok(!fs.existsSync(out), "--check renders nothing");

  const t0 = Date.now(), res = rw("batch", proj, rowsFile, "--concurrency", "2");
  assert.equal(res.status, 0, res.out);
  for (const n of ["blue", "red", "plain"]) assert.ok(fs.existsSync(path.join(out, n + ".mp4")), `${n}.mp4`);
  const px = (n) => pixel(path.join(out, n + ".mp4"), 20, 132, 1.0);
  const [b, r, p] = [px("blue"), px("red"), px("plain")];
  assert.ok(b[2] > 200 && b[0] < 60, `blue row: ${b}`); assert.ok(r[0] > 200 && r[2] < 60, `red row: ${r}`); assert.ok(p[1] > 120 && p[0] < 90, `plain row keeps the default green: ${p}`);
  const j = JSON.parse(fs.readFileSync(path.join(out, "batch.json"), "utf8"));
  assert.deepEqual(j.rows.map((x) => [x.name, x.status]), [["blue", "ok"], ["red", "ok"], ["plain", "ok"]]);
  assert.equal(j.concurrency, 2); assert.equal(j.ok, 3); assert.deepEqual(j.rows[0].variables, { accent: "#0000ff", bars: 3 });
  assert.equal(fs.readFileSync(path.join(proj, "hf", "kit-vars.js"), "utf8"), kit, "the source project's kit-vars.js is untouched");
  assert.deepEqual(fs.readdirSync(tmp).filter((f) => f.startsWith(".batch")), [], "work copies are removed");
  assert.ok(!fs.existsSync(path.join(proj, "frames")), "the source project was not rendered into");
  console.log(`PASS  batch: 3 rows, 2 at a time → 3 mp4 with their own variables (${((Date.now() - t0) / 1000).toFixed(0)} s), batch.json, source untouched`);

  // a bad row stops the batch before anything renders
  fs.rmSync(out, { recursive: true });
  fs.writeFileSync(rowsFile, JSON.stringify([{ _name: "fine" }, { _name: "oops", bars: "many" }]));
  const bad = rw("batch", proj, rowsFile);
  assert.equal(bad.status, 1); assert.match(bad.out, /row 2 \(oops\)[\s\S]*variable_type_mismatch/); assert.ok(!fs.existsSync(out), "nothing rendered");

  // a row that fails while rendering (film.js throws for loud + dark): reported, the others still render; --fail-fast skips the rest
  fs.writeFileSync(rowsFile, JSON.stringify([{ _name: "a" }, { _name: "broken", tone: "loud", dark: true }, { _name: "c" }]));
  const mixed = rw("batch", proj, rowsFile);
  assert.equal(mixed.status, 1, "exit 1 when a row failed");
  const m = JSON.parse(fs.readFileSync(path.join(out, "batch.json"), "utf8"));
  assert.deepEqual(m.rows.map((x) => x.status), ["ok", "failed", "ok"]); assert.match(m.rows[1].error, /film exited/);
  assert.ok(fs.existsSync(path.join(out, "a.mp4")) && fs.existsSync(path.join(out, "c.mp4")) && !fs.existsSync(path.join(out, "broken.mp4")));
  fs.rmSync(out, { recursive: true });
  const ff = rw("batch", proj, rowsFile, "--fail-fast");
  assert.equal(ff.status, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, "batch.json"), "utf8")).rows.map((x) => x.status), ["ok", "failed", "skipped"]);
  console.log("PASS  batch: bad row stops before rendering; a failed render is reported and the rest finish; --fail-fast skips the rest");
}

// ── 4. the same on the pvk renderer (a project two levels under the repo: its page loads ../../../tools) ──
{
  const pdir = makeProject(path.join(ROOT, "projects", ".p1-pvk-" + process.pid), { renderer: "pvk" });
  try {
    fs.writeFileSync(path.join(tmp, "pvk-rows.json"), JSON.stringify([{ _name: "blue", accent: "#0000ff" }, { _name: "plain" }]));
    const r = rw("batch", pdir, path.join(tmp, "pvk-rows.json"), "--concurrency", "2");
    assert.equal(r.status, 0, r.out);
    const [b, p] = [pixel(path.join(pdir, "out", "batch", "blue.mp4"), 20, 132, 1.0), pixel(path.join(pdir, "out", "batch", "plain.mp4"), 20, 132, 1.0)];
    assert.ok(b[2] > 200 && b[0] < 60, `pvk blue row: ${b}`); assert.ok(p[1] > 120 && p[0] < 90, `pvk plain row: ${p}`);
    assert.deepEqual(fs.readdirSync(path.join(ROOT, "projects")).filter((f) => f.startsWith(".batch-.p1-pvk")), [], "pvk work copies removed");
    console.log("PASS  batch on renderer pvk: 2 rows with their own variables");
  } finally { fs.rmSync(pdir, { recursive: true, force: true }); }
}
fs.rmSync(tmp, { recursive: true, force: true });
