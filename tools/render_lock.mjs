// Render lock queue (I13, `--lock [--lock-timeout SECONDS]` on frames/film/all/stills/encode): renders on this machine run one at a time, in the
// order they asked. A ticket file <tmp>/reelwright-render-lock/<time>-<pid> per waiting or running render; yours runs when it is the oldest ticket of a
// live process (a crashed render's ticket is dropped the next time anyone looks). Synchronous, so the dispatcher can hold it around spawnSync steps.
//   acquire({ dir, timeoutMs, log, pid }) → release()   waits (polling, log() says who holds it); throws after timeoutMs (0 = wait forever)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const lockDir = () => process.env.REELWRIGHT_LOCK_DIR || path.join(os.tmpdir(), "reelwright-render-lock");
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function queue(dir = lockDir()) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).sort()) {
    const m = /^(\d+)-(\d+)$/.exec(f);
    if (!m) continue;
    if (!alive(Number(m[2]))) { fs.rmSync(path.join(dir, f), { force: true }); continue; }   // its render died
    out.push({ file: f, pid: Number(m[2]) });
  }
  return out;
}

export function acquire({ dir = lockDir(), timeoutMs = 0, log = () => {}, pid = process.pid } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const mine = `${String(Date.now()).padStart(15, "0")}-${pid}`, ticket = path.join(dir, mine);
  fs.writeFileSync(ticket, "");
  const release = () => fs.rmSync(ticket, { force: true });
  const t0 = Date.now();
  let told = 0;
  for (;;) {
    const q = queue(dir), at = q.findIndex((x) => x.file === mine);
    if (at <= 0) { process.once("exit", release); return release; }
    if (timeoutMs && Date.now() - t0 > timeoutMs) { release(); throw new Error(`gave up waiting for the render lock after ${Math.round((Date.now() - t0) / 1000)} s: pid ${q[0].pid} is rendering, ${at} ahead of this one`); }
    if (Date.now() - told > 5000) { told = Date.now(); log(`render lock: waiting, ${at} render${at > 1 ? "s" : ""} ahead (pid ${q[0].pid} is running)`); }
    sleep(200);
  }
}
