// node tools/selfcheck/blocks.mjs [names…] — the vendored HyperFrames blocks (tools/blocks.mjs): index.json matches the
// folders, every block html carries the changed-from-upstream header and no remote URL, and a sample of blocks (GSAP, three
// ESM, hf-seek, lottie, a three addon, three r147, d3 + topojson + atlas; or the names given) passes verify: two pages under the
// producer's file server, two shuffled seek orders, same pixels, no page error, no network request.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { BLOCKS, index, verify } from "../blocks.mjs";

const { blocks } = index();
const dirs = fs.readdirSync(BLOCKS).filter((d) => fs.statSync(path.join(BLOCKS, d)).isDirectory()).sort();
const sup = Object.keys(blocks).filter((n) => blocks[n].status === "supported").sort();
assert.deepEqual(dirs, sup, "index.json supported blocks ≠ folders in vendor/hyperframes/registry/blocks");
for (const n of Object.keys(blocks)) if (blocks[n].status !== "supported") assert.ok(blocks[n].reason, `${n}: unsupported without a reason`);
for (const n of sup) {
  const html = fs.readFileSync(path.join(BLOCKS, n, n + ".html"), "utf8");
  assert.ok(html.startsWith("<!-- Changed from upstream HyperFrames (Apache-2.0, Copyright HeyGen)"), `${n}: no changed-from-upstream header`);
  const urls = (html.match(/https?:\/\/[^\s"'`)<>]+/g) || []).filter((u) => !u.startsWith("http://www.w3.org/"));
  assert.deepEqual(urls, [], `${n}: remote URLs`);
  assert.ok(/<template>/.test(html) && html.includes(`data-composition-id="${blocks[n].id}"`), `${n}: not a KIT.mount template`);
}
const want = process.argv.slice(2);
const sample = want.length ? want : ["ai-answer-rank", "glass-hero", "orbit-card", "lottie-character-walk", "exploded-stack", "spiral-galaxy", "world-map"].filter((n) => sup.includes(n));
const res = await verify(sample);
const bad = Object.entries(res).filter(([, r]) => r);
assert.deepEqual(bad, [], "verify failed");
console.log(`blocks: ${sup.length} vendored, index consistent; verify ok for ${sample.join(", ")}`);
