// tools/text-split.js: KIT.text.split / reveal / axes / maskLines. The film reveals three headlines (lines behind a line-box
// mask, words with a tracking animation, chars fading up) so the shuffled-seek run covers every path in both renderers.
// check() asserts the split's boxes against the canvas, the mask geometry (clip = lineHeight · 1.15, lines at lineHeight
// steps), a glyph fully hidden at t = 0 and fully visible at t = dur, tracking changing advance widths, the axis validation
// (unknown tag and static family throw), the canvas path and the line boxes of a static element. The pixel assertions run in
// tools/selfcheck/text-split.mjs (both renderers); check() must leave the visible page as it found it.
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export default {
  scripts: ["tools/text-split.js"], dur: 3,
  assets: (dir) => fs.copyFileSync(fileURLToPath(new URL("../../../fonts/inter/400.woff2", import.meta.url)), dir + "/var.woff2"),
  film: `
const font = 'Arial, Helvetica, sans-serif', SIZE = 26, LH = 1.2;
// two declared families for the axis checks: one variable (a weight range), one static
const st = document.createElement('style');
st.textContent = '@font-face{font-family:VarTest;src:url(var.woff2) format("woff2");font-weight:100 900}' +
  '@font-face{font-family:StaticTest;src:url(var.woff2) format("woff2");font-weight:400}';
document.head.appendChild(st);
const opts = { font, size: SIZE, weight: 700, tracking: 0.01, lineHeight: LH, maxWidth: 360 };
const parts = KIT.text.split('Typographic motion, on a mask', opts);
const host = KIT.el('div', '', S);
KIT.css(host, { left: '40px', top: '30px', width: '420px' });
const lines = KIT.text.reveal(host, parts, { by: 'lines', mask: true, stagger: 0.08, dur: 0.9 });
const wordsHost = KIT.el('div', '', S);
KIT.css(wordsHost, { left: '40px', top: '150px', width: '420px' });
const words = KIT.text.reveal(wordsHost, KIT.text.split('Words settle, tracking closes in', opts), { by: 'words', mask: true, stagger: 0.03, dur: 0.7, at: 0.1, tracking: [0.06, 0.01] });
const charsHost = KIT.el('div', '', S);
KIT.css(charsHost, { left: '40px', top: '250px', width: '420px' });
const chars = KIT.text.reveal(charsHost, KIT.text.split('Chars rise', { ...opts, maxWidth: 0 }), { by: 'chars', mask: false, stagger: 0.02, dur: 0.6, at: 0.2, from: 'center' });
const dot = KIT.el('div', '', S);
KIT.css(dot, { left: '10px', top: '340px', width: '10px', height: '10px', background: '#36c' });
window.TS = { parts, opts, host, wordsHost, charsHost, reveals: { lines, words, chars }, font, SIZE, LH };
KIT.start({ dur: 3, render: (t) => { lines.set(t); words.set(t); chars.set(t); dot.style.transform = 'translateX(' + 300 * t + 'px)'; } });`,
  check: async (p) => {
    const bad = await p.evaluate(async () => {
      const K = KIT, T = K.text, bad = [], is = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
      const { parts, opts, host, wordsHost, charsHost, reveals, font, SIZE, LH } = window.TS, lh = SIZE * LH, maskH = lh * 1.15;
      const near = (a, b, e = 0.01) => Math.abs(a - b) <= e;
      const c = document.createElement('canvas').getContext('2d');
      c.font = '700 ' + SIZE + 'px ' + font; c.letterSpacing = 0.01 * SIZE + 'px';

      // ── split: lines → words → glyphs, exact against the canvas ──
      is('split wraps into lines that fit maxWidth', parts.lines.length === 2 && parts.lines.every((l) => l.width <= 360 + 1e-6), parts.lines.map((l) => [l.text, l.width]));
      is('split: line y is baseline i·lh + half-leading + ascent', parts.lines.every((l, i) => near(l.y, i * lh + (lh - parts.ascent - parts.descent) / 2 + parts.ascent)), parts.lines.map((l) => l.y));
      is('split: height is lines · lineHeight', near(parts.height, parts.lines.length * lh) && near(parts.lineHeight, lh), [parts.height, parts.lineHeight]);
      is('split: glyph x is the running sum of the advances, width is the last right edge', parts.lines.every((l) => {
        let x = 0; for (const g of l.glyphs) { if (!near(g.x, x)) return false; if (!near(g.w, c.measureText(g.ch).width)) return false; x += g.w; } return near(l.width, x);
      }), parts.lines.map((l) => l.glyphs.slice(0, 3)));
      is('split: a line measures as wide as the canvas says (no pair kerning: within 1 %)', parts.lines.every((l) => Math.abs(c.measureText(l.text).width - l.width) < 0.01 * l.width + 0.5), parts.lines.map((l) => [c.measureText(l.text).width, l.width]));
      is('split is cached and stable: the same call returns the same object', T.split('Typographic motion, on a mask', opts) === parts, 0);
      const wide = T.split('Typographic motion, on a mask', { ...opts, maxWidth: 0 });
      is('split: maxWidth 0 does not wrap', wide.lines.length === 1 && wide.width > 360, wide.lines.length);
      const loose = T.split('Typographic motion, on a mask', { ...opts, tracking: 0.1, maxWidth: 0 });
      is('split: tracking widens every advance (0.01em → 0.1em)', loose.width > wide.width + 0.05 * SIZE * wide.lines[0].glyphs.length, [wide.width, loose.width]);
      is('split: tracking takes px as well as em', near(T.split('ab', { ...opts, tracking: '2px' }).width - T.split('ab', { ...opts, tracking: 0 }).width, 4, 0.02), 0);
      try { T.split('x', { font, size: 0 }); bad.push('size 0 accepted'); } catch { /* refused */ }

      // ── mask geometry ──
      const boxes = [...host.children], els = boxes.map((b) => b.firstChild), hgt = (e) => e.getBoundingClientRect().height;
      is('reveal: one mask box per line, clip-path inset(0) on it', boxes.length === parts.lines.length && boxes.every((b) => b.style.clipPath === 'inset(0px)'), boxes.map((b) => b.style.clipPath));
      is('reveal: the mask is lineHeight · 1.15 tall and the line box is lineHeight', boxes.every((b) => near(hgt(b), maskH, 0.02) && near(hgt(b.firstChild), lh, 0.02)), [hgt(boxes[0]), hgt(els[0]), maskH, lh]);
      is('reveal: line boxes stack at lineHeight (the mask padding overlaps the next line)', boxes.every((b, i) => near(b.offsetTop, i * lh, 0.6)), boxes.map((b) => b.offsetTop));
      is('reveal: the first line sits at the mask top, so its baseline is half-leading + ascent', els[0].offsetTop === 0 && boxes[0].offsetTop === 0, [els[0].offsetTop, boxes[0].offsetTop]);

      // ── hidden at t = 0, visible at t = dur ──
      const rev = reveals.lines, ty = (e) => parseFloat(e.style.transform.slice(11));
      rev.set(0);
      is('reveal: every line is translated below its mask at t = 0 (fully hidden)', els.every((e) => near(ty(e), maskH + 2, 0.02)), els.map((e) => e.style.transform));
      rev.set(0.9);
      is('reveal: the first line is at 0 (fully visible) at t = dur', ty(els[0]) === 0, els[0].style.transform);
      is('reveal: the second line is still staggered at t = dur', ty(els[1]) > 0, els[1].style.transform);
      rev.set(rev.end);
      is('reveal: end is at + dur + the last stagger, and everything rests at 0', near(rev.end, 0.9 + 0.08 * (parts.lines.length - 1), 1e-9) && els.every((e) => ty(e) === 0), [rev.end, els.map((e) => e.style.transform)]);
      rev.set(0.45); const mid = els.map((e) => e.style.transform); rev.set(0.45);
      is('reveal: set(t) is pure (same t, same transforms)', mid.join() === els.map((e) => e.style.transform).join(), mid);
      const wl = [...wordsHost.children][0].firstChild;
      is('reveal: words are spans in the line, tracking is written per line', wl.children.length > 1 && wl.style.letterSpacing !== '', [wl.children.length, wl.style.letterSpacing]);
      reveals.words.set(0); const t0 = wl.style.letterSpacing;
      reveals.words.set(1.6); const t1 = wl.style.letterSpacing;
      is('reveal: tracking closes from 0.06em to 0.01em over the entrance', parseFloat(t0) > parseFloat(t1) && near(parseFloat(t1), 0.01 * SIZE, 0.02), [t0, t1]);

      // ── variable-font axes ──
      await document.fonts.load('400 40px VarTest'); await document.fonts.load('400 40px StaticTest');
      const ax = T.axes('VarTest', { wght: [400, 700], GRAD: [0, 80] });
      is('axes: interpolates every axis into font-variation-settings', ax(0.5) === '"wght" 550.00, "GRAD" 40.00', ax(0.5));
      try { T.axes('VarTest', { weght: [400, 700] }); bad.push('unknown axis accepted'); } catch (e) { is('axes: an unknown axis tag throws, naming the known ones', /unknown axis "weght"/.test(e.message) && /wght/.test(e.message), e.message); }
      try { T.axes('StaticTest', { wght: [400, 700] }); bad.push('static family accepted'); } catch (e) { is('axes: a static family throws (no axis would move)', /not variable/.test(e.message), e.message); }
      is('axes: { variable: true } skips the static check', T.axes('StaticTest', { wght: [400, 700] }, { variable: true })(0) === '"wght" 400.00', 0);
      const aHost = document.createElement('div'), aRev = T.reveal(aHost, T.split('Axes', { ...opts, font: 'VarTest' }), { axes: { wght: [400, 700], opsz: [14, 72] }, dur: 1 });
      const aEl = aHost.firstChild.firstChild;
      aRev.set(1);
      is('axes: reveal writes the settings and turns optical sizing off when opsz moves', /"wght" 700(\.0+)?,/.test(aEl.style.fontVariationSettings) && /"opsz" 72(\.0+)?$/.test(aEl.style.fontVariationSettings) && aEl.style.fontOpticalSizing === 'none', [aEl.style.fontVariationSettings, aEl.style.fontOpticalSizing]);
      aRev.set(0);
      is('axes: at t = 0 the axes are at their first value', /"wght" 400(\.0+)?,/.test(aEl.style.fontVariationSettings), aEl.style.fontVariationSettings);

      // ── several faces per family: one loaded is enough, none loaded throws ──
      const woff = new URL('var.woff2', document.baseURI).href;
      const f400 = new FontFace('MultiFace', `url("${woff}")`, { weight: '400' }), f700 = new FontFace('MultiFace', `url("${woff}")`, { weight: '700' });
      document.fonts.add(f400); document.fonts.add(f700);
      await f400.load();   // the 400 face loads; the unused 700 face stays unloaded
      const multi = T.split('One face', { font: 'MultiFace', size: 20, weight: 400 });
      is('split: a family with one loaded face measures (an unused face may be unloaded)', multi.lines.length === 1 && multi.lines[0].glyphs.length > 0, multi.lines.length);
      is('axes: a family with one loaded face passes the loaded check', T.axes('MultiFace', { wght: [400, 700] }, { variable: true })(0.5) === '"wght" 550.00', 0);
      document.fonts.add(new FontFace('DeadFace', `url("${woff}")`));   // declared, never loaded
      try { T.split('No face', { font: 'DeadFace', size: 20 }); bad.push('split: a family with no loaded face was accepted'); }
      catch (e) { is('split: no loaded face throws and names every face', /no face of font "DeadFace"/.test(e.message) && /faces: normal normal → unloaded/.test(e.message), e.message); }
      try { T.axes('DeadFace', { wght: [400, 700] }, { variable: true }); bad.push('axes: a family with no loaded face was accepted'); }
      catch (e) { is('axes: no loaded face throws and names every face', /no face of font "DeadFace"/.test(e.message) && /unloaded/.test(e.message), e.message); }
      // a canvas draws through ctx.font: font-variation-settings cannot apply, so axes is refused, not ignored
      try { T.reveal(document.createElement('canvas'), T.split('Canvas axes', { ...opts, maxWidth: 0 }), { axes: { wght: [400, 700] } }); bad.push('canvas + axes accepted'); }
      catch (e) { is('reveal: axes on a canvas host throws', /axes need a DOM host/.test(e.message), e.message); }

      // ── maskLines: line boxes of a static element ──
      const stat = KIT.el('div', '', KIT.stage, 'one line here<br>and a second one');
      KIT.css(stat, { left: '300px', top: '10px', width: '200px', font: '700 20px/1.5 ' + font, color: '#1d1b16' });
      const ml = T.maskLines(stat, { lineHeight: 30, pad: 2 });
      is('maskLines: one box per rendered line, lineHeight tall, padded, one step apart', ml.lines.length === 2 && ml.lines.every((l) => near(l.height, 34, 0.02)) && near(ml.lines[1].y - ml.lines[0].y, 30, 0.02), ml.lines);
      is('maskLines: the clip is one path per line and is applied to the element', (ml.clip.match(/M /g) || []).length === 2 && stat.style.clipPath === ml.clip, ml.clip);
      stat.remove();

      // ── from: center / edges only change the delays ──
      const chars = [...charsHost.querySelectorAll('span')];
      reveals.chars.set(0.25);   // at 0.2, dur 0.6, from center: the middle glyph is ahead of the ends
      const ct = chars.map((e) => ty(e)), half = Math.floor(ct.length / 2);
      is('reveal from center: the middle glyph leads the ends', ct[half] < ct[0] && ct[half] < ct[ct.length - 1], [ct[0], ct[half], ct[ct.length - 1]]);
      const eHost = document.createElement('div');
      const eRev = T.reveal(eHost, T.split('Edges', { ...opts, maxWidth: 0 }), { by: 'chars', mask: false, from: 'edges', dur: 0.6, stagger: 0.05 });
      eRev.set(0.05);
      const et = [...eHost.querySelectorAll('span')].map((e) => ty(e));
      is('reveal from edges: both ends lead the middle', et[0] < et[Math.floor(et.length / 2)] && et[et.length - 1] < et[Math.floor(et.length / 2)], et);

      // ── canvas: clipped strips, pure in t, for every unit ──
      for (const by of ['lines', 'words', 'chars']) {
        const cv = document.createElement('canvas'); cv.width = 200; cv.height = 60;
        const g = cv.getContext('2d'), cRev = T.reveal(cv, T.split('Canvas ink', { ...opts, maxWidth: 0 }), { by, dur: 1, color: '#000' });
        const ink = () => [...g.getImageData(0, 0, 200, 60).data].filter((v, i) => i % 4 === 3 && v > 0).length;
        cRev.set(0); const none = ink();
        cRev.set(1); const full = ink(); cRev.set(1); const full2 = ink();
        is(`canvas reveal by ${by}: nothing at t = 0, ink at t = dur, pure in t`, none === 0 && full > 50 && full === full2, [none, full, full2]);
      }
      return bad;
    });
    // ── pixels: a masked line is invisible at t = 0, partly wiped mid-entrance, complete at the end ──
    const box = { x: 38, y: 28, width: 410, height: 70 };   // the first headline's two line boxes
    const seek = (t) => p.evaluate(async (t) => { if (window.__hf) { window.__hf.seek(t); await window.__hfWaitForSeekCompletion?.(); } else await window.render(t); }, t);
    const ink = async () => {
      const b = await p.screenshot({ type: "png", clip: box });
      return p.evaluate(async (b64) => {
        const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
        const g = new OffscreenCanvas(im.width, im.height).getContext("2d"); g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, im.width, im.height).data;
        let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 246) + Math.abs(d[i + 1] - 244) + Math.abs(d[i + 2] - 239) > 60) n++;
        return n;
      }, b.toString("base64"));
    };
    await seek(0); const zero = await ink();
    await seek(0.12); const mid = await ink();
    await seek(3); const all = await ink(); await seek(3); const all2 = await ink();
    const px = [];
    if (zero !== 0) px.push(`the masked headline is not empty at t = 0 (${zero} px)`);
    if (!(mid > 0 && mid < all * 0.95)) px.push(`mid-wipe is not partial (${mid} of ${all} px)`);
    if (!(all > 300)) px.push(`the headline is not visible at the end (${all} px)`);
    if (all !== all2) px.push(`the same t gives different pixels (${all} then ${all2})`);
    if (px.length) bad.push(...px);
    if (bad.length) throw new Error('text-split check:\n  ' + bad.join('\n  '));
  },
};
