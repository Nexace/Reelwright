// tools/p5-media.js KIT.animatedImage on frames that tools/p5-animimg.mjs really extracted from a GIF made with ffmpeg (5 frames, 0.2 s each):
// loop / pause-after-finish / clear-after-finish, playbackRate, seeking in any order.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractAnimation } from "../../p5-animimg.mjs";

const src = fs.mkdtempSync(path.join(os.tmpdir(), "p5-gif-"));
const g = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=duration=1:size=96x72:rate=5", path.join(src, "clip.gif")]);
if (g.status !== 0) throw new Error("ffmpeg could not make the test gif");
const meta = extractAnimation(path.join(src, "clip.gif"), path.join(src, "frames"));
void fileURLToPath;

export default {
  scripts: ["tools/p5-media.js"], dur: 4, assets: (dir) => fs.cpSync(path.join(src, "frames"), path.join(dir, "frames"), { recursive: true }),
  film: `
const META = ${JSON.stringify(meta)};
const T = window.T = {};
const slot = (x) => { const e = KIT.el('div', '', S); KIT.css(e, { left: x + 'px', top: '60px', width: '192px', height: '144px', background: '#222' }); return e; };
T.loop = KIT.animatedImage(META, { parent: slot(20), at: 0.5, w: 192, h: 144, base: 'frames/' });
T.pause = KIT.animatedImage(META, { parent: slot(224), at: 0.5, loopBehavior: 'pause-after-finish', w: 192, h: 144, base: 'frames/', fit: 'cover' });
T.clear = KIT.animatedImage(META, { parent: slot(428), at: 0.5, loopBehavior: 'clear-after-finish', playbackRate: 2, w: 192, h: 144, base: 'frames/' });
KIT.start({ dur: 4, render: (t) => { T.loop.set(t); T.pause.set(t); T.clear.set(t); } });`,
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const T = window.T, bad = [], near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
      const f = (a, t) => T[a].frameAt(t), want = (what, got, exp) => { if (got !== exp) bad.push(what + ': ' + got + ', wanted ' + exp); };
      want('before at', f('loop', 0.4), -1); want('first frame', f('loop', 0.5), 0); want('frame 1 at 0.2 s', f('loop', 0.5 + 0.2), 1); want('frame 1 just before 0.4', f('loop', 0.5 + 0.399), 1);
      want('frame 4', f('loop', 0.5 + 0.99), 4); want('wraps', f('loop', 0.5 + 1.1), 0); want('wraps again', f('loop', 0.5 + 2.3), 1);
      want('pause holds the last frame', f('pause', 0.5 + 1.0), 4); want('pause holds it for good', f('pause', 3.9), 4); want('pause before at', f('pause', 0), -1);
      want('clear: playing', f('clear', 0.5 + 0.2), 2); want('clear: playbackRate 2 finishes at 0.5 s', f('clear', 0.5 + 0.49), 4); want('clear: gone after', f('clear', 0.5 + 0.5), -1);
      if (!near(T.loop.dur, 1) || !near(T.clear.dur, 0.5)) bad.push('dur ' + T.loop.dur + ', ' + T.clear.dur);
      // exactly one frame is visible and it is the one frameAt says
      for (const t of [0.4, 0.6, 1.0, 1.7, 2.5, 3.9]) {
        window.render(t);
        for (const k of ['loop', 'pause', 'clear']) {
          const imgs = [...T[k].el.querySelectorAll('img')], on = imgs.map((im, i) => im.style.visibility === 'visible' ? i : -1).filter((i) => i >= 0), i = T[k].frameAt(t);
          if (JSON.stringify(on) !== JSON.stringify(i < 0 ? [] : [i])) bad.push(k + ' at ' + t + ': visible ' + JSON.stringify(on) + ' but frameAt is ' + i);
        }
      }
      const loaded = [...document.querySelectorAll('.kit-animimg img')].every((im) => im.complete && im.naturalWidth > 0);
      if (!loaded) bad.push('animatedImage: frames are not all loaded when READY resolves');
      for (const [what, fn] of [['an unknown loopBehavior', () => KIT.animatedImage({ frames: ['a'], durations: [1] }, { loopBehavior: 'bounce' })],
        ['mismatched meta', () => KIT.animatedImage({ frames: ['a', 'b'], durations: [1] })], ['a zero playbackRate', () => KIT.animatedImage({ frames: ['a'], durations: [1] }, { playbackRate: 0 })]]) {
        try { fn(); bad.push('animatedImage must throw for ' + what); } catch {}
      }
      return bad.slice(0, 20);
    });
    if (errs.length) throw new Error('media check:\n  ' + errs.join('\n  '));
  } };
