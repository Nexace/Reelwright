// node tools/selfcheck/p8-layout.mjs — the layout and occlusion audit (tools/checks/layout.audit.mjs, `reelwright check`) on a fixture page whose
// render(t) puts: text outside the frame, text cut by an overflow:hidden box, text covered by a panel, and a caption row over other text,
// each only after 1 s. A clean frame (t < 1) gives no lines; sampling honours --at, --range and transitions. Offline.
import assert from "node:assert/strict";
import { launch } from "../browser.mjs";
import { audit } from "../checks/layout.audit.mjs";

const HTML = `<!doctype html><body style="margin:0;width:800px;height:450px;position:relative;font:20px Arial">
<div id=out style="position:absolute;left:700px;top:20px;white-space:nowrap">Running off the right edge</div>
<div id=box style="position:absolute;left:20px;top:80px;width:120px;height:40px;overflow:hidden"><span id=cut style="position:absolute;left:0;white-space:nowrap">A long clipped headline</span></div>
<div id=under style="position:absolute;left:300px;top:200px">Hidden under a panel</div>
<div id=panel style="position:absolute;left:280px;top:190px;width:300px;height:60px;background:#222"></div>
<div id=other style="position:absolute;left:40px;top:370px">Lower third name</div>
<div class=kit-subs style="position:absolute;left:0;top:360px"><div class=kit-subrow style="position:absolute;left:30px;top:0">Caption words here</div></div>
<div id=ok style="position:absolute;left:300px;top:20px">All fine</div>
<script>
window.FILM = { DUR: 3, FPS: 30, cues: [{ t: 2, kind: "whoosh" }] };
window.render = (t) => {
  const bad = t >= 1;
  out.style.display = bad ? "block" : "none"; box.style.display = bad ? "block" : "none"; under.style.display = bad ? "block" : "none";
  panel.style.display = bad ? "block" : "none"; other.style.display = bad ? "block" : "none";
  document.querySelector(".kit-subs").style.display = bad ? "block" : "none";
};
window.READY = Promise.resolve(true);
</script></body>`;

const b = await launch();
try {
  const p = await b.newPage({ viewport: { width: 800, height: 450 } });
  await p.setContent(HTML);
  const all = await audit(p, {});
  const text = all.join("\n");
  for (const re of [/Running off the right edge.* runs outside the frame/, /A long clipped headline.* is cut by div#box/, /Hidden under a panel.* is covered by div#panel/, /caption zone: "Lower third name" overlaps the caption row/])
    assert.match(text, re, `missing ${re}\n${text}`);
  assert.doesNotMatch(text, /All fine/, "clean text is not flagged");
  assert.ok(all.every((l) => !/^0\./.test(l)), "nothing flagged before t = 1");
  assert.deepEqual(await audit(p, { at: [0.2, 0.7] }), [], "--at on clean frames");
  assert.ok((await audit(p, { at: [2.5] })).length >= 4, "--at on a bad frame");
  assert.deepEqual(await audit(p, { range: [0, 0.9] }), [], "--range before the problems");
  const tr = await audit(p, { range: [0, 0], transitions: true });
  assert.ok(tr.length >= 4 && tr.every((l) => parseFloat(l) >= 1.9), "transitions sample around the whoosh at 2 s: " + tr[0]);
  console.log(`p8-layout self-check: frame, clip, occlusion and caption-zone found (${all.length} lines), clean frames silent, --at/--range/transitions honoured`);
} finally { await b.close(); }
