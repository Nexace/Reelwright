// node tools/gen/test.mjs — exit test for `reelwright gen`: runs tools/gen.mjs against the local mock (mock.mjs),
// never the real Higgsfield API and never a real credentials file. Prints PASS lines; non-zero exit on failure.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { startMock } from "./mock.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const GEN = path.join(ROOT, "tools", "gen.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rw-gen-"));
const KEYS = { HIGGSFIELD_API_KEY_ID: "test-key-id", HIGGSFIELD_API_KEY_SECRET: "test-key-secret" };
const seen = [];   // every stdout/stderr, grepped for secrets at the end
let n = 0;
const mkproj = () => { const d = path.join(tmp, `p${++n}`); fs.mkdirSync(d); fs.writeFileSync(path.join(d, "project.json"), "{}"); return d; };
const tree = (d) => fs.readdirSync(d, { recursive: true }).sort().map((f) => f + ":" + (fs.statSync(path.join(d, f)).isFile() ? fs.readFileSync(path.join(d, f)).toString("hex") : "dir")).join("\n");
const git = () => spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" }).stdout;
const manifest = (d) => JSON.parse(fs.readFileSync(path.join(d, "assets", "gen.json"), "utf8"));
const sub = (m) => m.calls.filter((c) => c.method === "POST" && !c.path.startsWith("/estimate/"));

function gen(proj, args, { url, keys = KEYS, stdin = "" } = {}) {
  const env = { ...process.env, REELWRIGHT_CREDENTIALS: path.join(tmp, "no-such-credentials.json"), ...(url && { REELWRIGHT_HIGGSFIELD_URL: url }) };
  delete env.HIGGSFIELD_API_KEY_ID; delete env.HIGGSFIELD_API_KEY_SECRET;
  return new Promise((res) => {
    const p = spawn(process.execPath, [GEN, proj, ...args], { env: { ...env, ...keys } });
    let out = "", err = "";
    p.stdout.on("data", (d) => out += d); p.stderr.on("data", (d) => err += d);
    p.on("close", (code) => { seen.push(out, err); res({ code, out, err }); });
    p.stdin.end(stdin);
  });
}
const ok = (s) => console.log("PASS", s);
const base = ["--provider", "higgsfield", "--out", "assets/hero.png"];

const m = await startMock({ scenario: "ok" });
try {
  // 1. generation with stdin y
  const A = mkproj(), repoBefore = git();
  let r = await gen(A, [...base, "a red fox"], { url: m.url, stdin: "y\n" });
  assert.equal(r.code, 0, r.err + r.out);
  assert.match(r.out, /Higgsfield estimate for your account: \$0\.094/);
  const png = fs.readFileSync(path.join(A, "assets", "hero.png"));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  const e = manifest(A).assets[0];
  assert.deepEqual(Object.keys(e).sort(), ["date", "file", "key", "kind", "model", "prompt", "provider", "sha256", "sourceUrlHost"]);
  assert.equal(e.file, "assets/hero.png"); assert.equal(e.provider, "higgsfield"); assert.equal(e.kind, "image");
  assert.equal(e.model, "higgsfield-ai/soul/standard"); assert.equal(e.prompt, "a red fox");
  assert.equal(e.sha256, crypto.createHash("sha256").update(png).digest("hex")); assert.equal(e.sourceUrlHost, new URL(m.url).host);
  assert.deepEqual(m.calls.filter((c) => c.status).map((c) => c.status), ["queued", "in_progress", "completed"]);
  const s = sub(m)[0];
  assert.equal(s.headers.authorization, "Key test-key-id:test-key-secret"); assert.ok(s.headers["idempotency-key"]);
  assert.ok(!m.calls.find((c) => c.path.startsWith("/dl/")).headers.authorization, "CDN download got credentials");
  ok("generation: file, manifest entry, queued->in_progress->completed, no auth to the CDN");

  // 2. same command again: cache hit, zero calls, no keys (also to a different --out)
  const before = m.calls.length;
  r = await gen(A, ["--provider", "higgsfield", "--out", "assets/hero2.png", "a red fox"], { url: m.url, keys: {} });
  assert.equal(r.code, 0, r.err); assert.match(r.out, /cached/);
  assert.equal(m.calls.length, before); assert.deepEqual(fs.readFileSync(path.join(A, "assets", "hero2.png")), png);
  assert.equal(manifest(A).assets.length, 2);
  ok("cache hit: zero network calls, no credentials needed");

  // 3. nothing secret in the manifest or any output
  const dlUrl = m.calls.find((c) => c.url).url, statusUrl = `${m.url}/requests/req-1/status`;
  const hay = fs.readFileSync(path.join(A, "assets", "gen.json"), "utf8") + seen.join("\n");
  for (const bad of ["test-key-id", "test-key-secret", "X-Amz-Signature", "status_url", dlUrl, statusUrl]) assert.ok(!hay.includes(bad), `leaked ${bad}`);
  ok("manifest and output contain no key, signature, status URL or result URL");

  // 4. missing key: exit 2, nothing written
  const B = mkproj(), tb = tree(B), gb = git(), c0 = m.calls.length;
  r = await gen(B, [...base, "never submitted"], { url: m.url, keys: {} });
  assert.equal(r.code, 2); assert.match(r.err, /HIGGSFIELD_API_KEY_ID/); assert.match(r.err, /HIGGSFIELD_API_KEY_SECRET/);
  assert.equal(tree(B), tb); assert.equal(git(), gb); assert.equal(git(), repoBefore); assert.equal(m.calls.length, c0);
  ok("missing key: exit 2, names the variables, no files touched");

  // 7. estimate shown, answer n: no submit
  const D = mkproj(), td = tree(D), subs = sub(m).length, est = m.calls.filter((c) => c.path.startsWith("/estimate/")).length;
  r = await gen(D, [...base, "declined"], { url: m.url, stdin: "n\n" });
  assert.notEqual(r.code, 0); assert.match(r.out, /\$0\.094/); assert.match(r.out + r.err, /cancelled/);
  assert.equal(sub(m).length, subs); assert.equal(m.calls.filter((c) => c.path.startsWith("/estimate/")).length, est + 1); assert.equal(tree(D), td);
  ok("answer n: estimate shown, exit non-zero, zero submits");

  // 8. import
  const png2 = path.join(tmp, "ff.png"); fs.writeFileSync(png2, png);
  const F = mkproj(), c1 = m.calls.length;
  r = await gen(F, ["--import", png2, "--source", "firefly", "made in Firefly"], { url: m.url, keys: {} });
  assert.equal(r.code, 0, r.err);
  const f = manifest(F).assets[0];
  assert.deepEqual(f, { file: "assets/ff.png", provider: "firefly", kind: "image", note: "made in Firefly", date: f.date, sha256: crypto.createHash("sha256").update(png).digest("hex") });
  assert.deepEqual(fs.readFileSync(path.join(F, "assets", "ff.png")), png); assert.equal(m.calls.length, c1);
  ok("import: manifest entry with sha256, byte-identical copy, zero calls");

  // more than one positional (typo'd project name + prompt, or unquoted prompt): rejected before anything
  const G = mkproj(), tg = tree(G), c2 = m.calls.length;
  r = await gen(G, [...base, "one", "two"], { url: m.url });
  assert.equal(r.code, 1); assert.match(r.err, /quote the prompt/); assert.match(r.err, /project name/);
  assert.equal(m.calls.length, c2); assert.equal(tree(G), tg);
  ok("two positionals: rejected, zero calls, no files");

  // a key with a newline: refused up front, the value is never printed
  const L = mkproj(), tl = tree(L);
  r = await gen(L, [...base, "x"], { url: m.url, keys: { HIGGSFIELD_API_KEY_ID: "test-key-id", HIGGSFIELD_API_KEY_SECRET: "zq9sec\nzq9ret" }, stdin: "y\n" });
  assert.equal(r.code, 2); assert.match(r.err, /HIGGSFIELD_API_KEY_SECRET/); assert.ok(!(r.out + r.err).includes("zq9"));
  assert.equal(m.calls.length, c2); assert.equal(tree(L), tl);
  ok("invalid characters in a key: exit 2, names the variable, value not printed");

  // --out may not be the manifest
  r = await gen(L, ["--provider", "higgsfield", "--out", "assets/gen.json", "x"], { url: m.url }); assert.equal(r.code, 1);
  ok("--out assets/gen.json rejected");

  // usage / unknown provider
  r = await gen(F, []); assert.equal(r.code, 1); assert.match(r.err, /usage/);
  r = await gen(F, ["--provider", "nope", "x", "--out", "assets/x.png"]); assert.equal(r.code, 1); assert.match(r.err, /higgsfield/);
  ok("no provider: usage, exit 1; unknown provider lists higgsfield");
} finally { await m.close(); }

// 5. 429 + Retry-After
{
  const q = await startMock({ scenario: "queue-full-once" });
  try {
    const r = await gen(mkproj(), [...base, "busy"], { url: q.url, stdin: "y\n" });
    assert.equal(r.code, 0, r.err + r.out);
    const [a, b, ...rest] = sub(q);
    assert.equal(rest.length, 0); assert.equal(a.headers["idempotency-key"], b.headers["idempotency-key"]);
    assert.ok(b.t - a.t >= 990, `retried after ${b.t - a.t} ms`);   // Retry-After: 1
    ok("429: waited Retry-After, resubmitted with the same Idempotency-Key, succeeded");
  } finally { await q.close(); }
}

// 401 bad key
{
  const q = await startMock({ scenario: "bad-key" });
  try {
    const P = mkproj(), t0 = tree(P);
    const r = await gen(P, [...base, "nope"], { url: q.url, stdin: "y\n" });
    assert.notEqual(r.code, 0); assert.match(r.err, /credentials/); assert.equal(tree(P), t0);
    ok("401: non-zero exit, credentials message, no files");
  } finally { await q.close(); }
}

// 6. 403 no balance
{
  const q = await startMock({ scenario: "no-balance" });
  try {
    const P = mkproj(), t0 = tree(P);
    const r = await gen(P, [...base, "broke"], { url: q.url, stdin: "y\n" });
    assert.notEqual(r.code, 0); assert.match(r.err, /balance/i);
    assert.equal(tree(P), t0);   // no assets/ at all: no out file, no manifest
    ok("403: non-zero exit, balance message, no out file, no manifest change");
  } finally { await q.close(); }
}

// 3 (again, now that every run is in). The mock's URLs were port-bound; the key/secret/signature checks cover all runs.
const all = seen.join("\n");
for (const bad of ["test-key-id", "test-key-secret", "zq9", "X-Amz-Signature", "status_url"]) assert.ok(!all.includes(bad), `leaked ${bad}`);
fs.rmSync(tmp, { recursive: true, force: true });
console.log("all gen tests passed");
