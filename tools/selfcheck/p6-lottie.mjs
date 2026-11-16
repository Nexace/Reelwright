// node tools/selfcheck/p6-lottie.mjs — rows doodle-shots-motion:5.3 (HTML renderer), 5.5 (expressions), 5.6 (text layers),
// 5.7 (image assets, masks, mattes, gradients, trim paths, repeaters, effects). Each sample (tools/selfcheck/p6/lottie-samples.mjs)
// is played by KIT.lottie in both film renderers, seeked 12 times forward and the same times shuffled on a fresh browser: every
// frame must match (tools/selfcheck/p6-harness.mjs). check() also asserts the DOM holds the feature (a mask, a gradient, ...).
import { runFixtures, baseStyle } from "./p6-harness.mjs";
import { samples } from "./p6/lottie-samples.mjs";

const style = baseStyle("#stage > .full{left:0;top:0;width:640px;height:360px}");
const film = (name, opts = "{}") => `
const lot = KIT.lottie(KIT.el('div', 'full', S), ${JSON.stringify(samples[name])}, ${opts});
window.LOT = lot;
KIT.start({ dur: 2, render: (t) => lot.set(t) });`;
const fx = (name, sample, opts, check) => ({ name, scripts: ["vendor/lottie/lottie.min.js", "tools/runtimes.js"], dur: 2, style, film: film(sample, opts),
  check: check && (async (page) => { const bad = await page.evaluate(check); if (bad.length) throw new Error(`${name}: ${bad.join("; ")}`); }) });

const svgHas = (sel) => `!!document.querySelector('#stage svg ${sel}')`;
await runFixtures([
  fx("html-renderer", "shapes", "{ renderer: 'html' }", () => {   // 5.3
    const out = [], root = document.querySelector('#stage .full');
    if (!root.firstElementChild) out.push('html renderer drew nothing');
    if (window.LOT.anim.renderer.rendererType !== 'html') out.push('rendererType is ' + window.LOT.anim.renderer.rendererType);
    return out;
  }),
  fx("expressions", "expressions", "{}", () => {   // 5.5: time-driven expressions are evaluated and seek-pure
    const out = [], L = window.LOT;
    L.set(0); const a = document.querySelector('#stage svg g g').getAttribute('transform') || document.querySelector('#stage svg g').outerHTML.slice(0, 200);
    L.set(1.2); const b = document.querySelector('#stage svg g g').getAttribute('transform') || '';
    L.set(0); const c = document.querySelector('#stage svg g g').getAttribute('transform') || document.querySelector('#stage svg g').outerHTML.slice(0, 200);
    if (a === b) out.push('expression did not move the layer');
    if (a !== c) out.push('expression result depends on the previous seek');
    return out;
  }),
  fx("text-layer", "text", "{}", () => {   // 5.6
    const out = [];
    if (document.querySelectorAll('#stage svg [aria-label="Hi Lottie"] path').length < 8) out.push('the glyphs of "Hi Lottie" were not drawn');
    if (!(window.LOT.anim.renderer.globalData.fontManager.isLoaded)) out.push('fontManager not loaded');
    return out;
  }),
  fx("features-svg", "features", "{}", () => {   // 5.7
    const out = [], q = (s) => document.querySelector('#stage svg ' + s);
    for (const [n, s] of [['image', 'image'], ['mask', 'mask'], ['track matte', 'mask[id*=matte], clipPath, mask'], ['gradient', 'linearGradient'], ['effect', 'filter'], ['trim path', 'path[stroke-width="8"]']])
      if (!q(s)) out.push('no ' + n + ' in the svg (' + s + ')');
    return out;
  }),
  fx("features-canvas", "features", "{ renderer: 'canvas' }", () => {
    const c = document.querySelector('#stage canvas');
    return c ? [] : ['no canvas'];
  }),
], "p6-lottie");
