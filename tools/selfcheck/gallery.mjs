// node tools/selfcheck/gallery.mjs — `reelwright gallery` on a 3-item subset (a shotcard of A, one of B, one fx effect) through the real generator
// (tools/gallery.mjs), into a temp folder: the refs and the self-contained page come out; a second run gives the same bytes; `--check` passes on the
// fresh refs, flags a ref that was altered (another item's strip put in its place) and one that is missing, and says nothing about the others.
// The full gallery is not rendered here (about 30 s): `reelwright gallery --check` does that against docs/gallery/refs/.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { run, ROOT } from "../gallery.mjs";

const IDS = ["outro.logoLockup", "effects.fuiHud", "fx-blur.zoomBlur"];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-")), A = path.join(tmp, "a"), B = path.join(tmp, "b");
try {
  const q = (out, extra = {}) => run({ out, only: IDS, page: true, ...extra });
  assert.deepEqual((await q(A)).sort(), [...IDS].sort(), "the generator renders the three items");
  await q(B);
  for (const id of IDS) {
    const a = fs.readFileSync(path.join(A, "refs", id + ".jpg")), b = fs.readFileSync(path.join(B, "refs", id + ".jpg"));
    assert.ok(a.length > 500 && a[0] === 0xff && a[1] === 0xd8, `${id}: a jpg strip`);
    assert.ok(a.equals(b), `${id}: same input, same bytes`);
  }
  assert.ok(fs.readFileSync(path.join(A, "index.html")).equals(fs.readFileSync(path.join(B, "index.html"))), "index.html is the same bytes on a second run");
  const page = fs.readFileSync(path.join(A, "index.html"), "utf8");
  assert.equal((page.match(/<figure /g) || []).length, 3, "one figure per item");
  assert.ok(!/(src|href)="https?:/.test(page) && !/<link |<script src/.test(page), "the page is self-contained");
  for (const l of [...page.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1])) assert.ok(fs.existsSync(path.resolve(A, l)), `recipe link ${l} lands on a file`);
  assert.ok(page.includes("outro.logoLockup") && page.includes("data-mod=\"fx-blur\""), "item names and module filters are in the page");

  assert.deepEqual(await q(A, { check: true }), [], "--check passes on refs it just made");
  fs.copyFileSync(path.join(A, "refs", "effects.fuiHud.jpg"), path.join(A, "refs", "outro.logoLockup.jpg"));
  fs.rmSync(path.join(A, "refs", "fx-blur.zoomBlur.jpg"));
  assert.deepEqual((await q(A, { check: true })).sort(), ["fx-blur.zoomBlur", "outro.logoLockup"], "--check lists the altered ref and the missing one, only those");

  // the command: exit 1 listing the item, exit 0 when nothing changed (the CLI path: arguments, exit codes)
  const cli = (...a) => spawnSync(process.execPath, [path.join(ROOT, "bin", "reelwright.mjs"), "gallery", ...a], { encoding: "utf8" });
  const r = cli("shotcards", "--out", A, "--check", "--only", "outro.logoLockup");
  assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stdout, /outro\.logoLockup/);
  assert.equal(cli("shotcards", "--out", B, "--check", "--only", "outro.logoLockup").status, 0, "the command exits 0 when nothing changed");
  assert.equal(cli("bogus").status, 1, "an unknown kind is a usage error");
  console.log("gallery self-check: 3 items rendered through the generator, deterministic, self-contained, --check passes, detects an altered and a missing ref");
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
