// The fx-* gallery items (tools/gallery.mjs): [module, name, helper call, body, static?]. `body` is the text of a function body run in the page with
// G = { X (KIT.fx), P (KIT.fx.pattern), card(parent, {x,y,w,h}), canvas() (a drawn source), mk(css, parent), W, H } and `root` (a clipped 480x270 box
// on the stage); it returns f(p), p = 0..1 across the strip. An item marked static has no motion to show: its strip is one frame.
export const FX_FILES = { color: ["fx-color"], blur: ["fx-color", "fx-blur"], distort: ["fx-color", "fx-distort"], pattern: ["fx-color", "fx-pattern"], reveal: ["fx-color", "fx-reveal"], gl: ["fx-color", "fx-gl"] };

const live = (what, set) => `const c = card(root), f = ${what}; return (p) => f.set(${set}).on(c);`;   // an SVG-filter handle on a card
const pat = (call, set, bg = "#fff") => `const b = mk({ background: '${bg}', overflow: 'hidden' }), f = P.${call}; return (p) => f.set(${set});`;
const canvasFx = (call, set) => `const f = X.${call}; return (p) => f.set(${set});`;
const wipe = (call, o = "") => `const c = card(root), f = X.${call}(c${o}); return (p) => f.set(p);`;

export const FX = [
  // fx-color.js
  ["color", "filter-hue", "KIT.fx.filter({ hue })", `const c = card(root); return (p) => { c.style.filter = X.filter({ hue: 360 * p }); };`],
  ["color", "filter-glow", "KIT.fx.filter({ glow })", `const c = card(root, { x: 60, y: 45, w: 360, h: 180 }); return (p) => { c.style.filter = X.filter({ glow: { radius: 14, color: '#ff3b6b', strength: Math.round(3 * p) } }); };`],
  ["color", "filter-dropShadow", "KIT.fx.filter({ dropShadow })", `mk({ background: '#e8e2d4' }); const c = card(root, { x: 60, y: 40, w: 340, h: 170 }); return (p) => { c.style.filter = X.filter({ dropShadow: { x: 0, y: 26 * p, blur: 10 * p, color: 'rgba(0,0,0,.7)' } }); };`],
  ["color", "tint", "KIT.fx.tint({ color, amount })", live("X.tint({ color: '#ff2d55', amount: 0 })", "{ color: '#ff2d55', amount: p }")],
  ["color", "duotone", "KIT.fx.duotone({ dark, light, amount })", live("X.duotone({ dark: '#102030', light: '#f0e0d0' })", "{ dark: '#102030', light: '#f0e0d0', amount: p }")],
  ["color", "exposure", "KIT.fx.exposure({ stops })", live("X.exposure({ stops: 0 })", "{ stops: -1 + 2 * p }")],
  ["color", "whiteBalance", "KIT.fx.whiteBalance({ temperature, tint })", live("X.whiteBalance({})", "{ temperature: -1 + 2 * p }")],
  ["color", "shadowsHighlights", "KIT.fx.shadowsHighlights({ shadows, highlights })", live("X.shadowsHighlights({})", "{ shadows: p, highlights: -p }")],
  ["color", "levels", "KIT.fx.levels({ inBlack, inWhite, gamma })", live("X.levels({})", "{ inBlack: 0.3 * p, inWhite: 1 - 0.3 * p, gamma: 1 + 0.6 * p }")],
  ["color", "curves", "KIT.fx.curves(points)", live("X.curves([[0, 0], [0.5, 0.5], [1, 1]])", "[[0, 0], [0.5, 0.5 - 0.3 * p], [1, 1]]")],
  ["color", "curves-channel", "KIT.fx.curves(points, { channel: 'r' })", live("X.curves([[0, 0], [0.5, 0.5], [1, 1]], { channel: 'r' })", "[[0, 0], [0.5, 0.5 + 0.35 * p], [1, 1]]")],
  ["color", "longShadow", "KIT.fx.longShadow({ length, angle, color })", `const c = mk({ left: '170px', top: '60px', width: '110px', height: '110px', background: '#36b3a0', borderRadius: '22px' }), f = X.longShadow({ length: 0 }); return (p) => f.set({ length: 150 * p, angle: 45, color: '#ff5a36' }).on(c);`],
  ["color", "pixels", "KIT.fx.pixels(src, fn)", `const f = X.pixels(canvas(), (d, i, p) => { const g = (d[i] + d[i + 1] + d[i + 2]) / 3; for (let k = 0; k < 3; k++) d[i + k] += (g - d[i + k]) * p; }, { w: W, h: H, parent: root }); return (p) => f.set(p);`],
  ["color", "colorKey", "KIT.fx.colorKey(src, { key })", `mk({ background: '#ff5a36' }); const f = X.colorKey(canvas('#00ff00'), { key: '#00ff00', w: W, h: H, parent: root }); f.set(); return () => {};`, true],
  ["color", "vibrance", "KIT.fx.vibrance(src, { amount })", `const f = X.vibrance(canvas(), { w: W, h: H, parent: root }); return (p) => f.set(2 * p - 1);`],
  ["color", "vignette", "KIT.fx.vignette(parent, { strength })", `card(root); const f = X.vignette(root, { strength: 0.95 }); return (p) => f.set(p);`],
  ["color", "shine", "KIT.fx.shine(parent, { width })", `card(root); const f = X.shine(root, { width: 0.25 }); return (p) => f.set(p);`],
  // fx-blur.js
  ["blur", "progressiveBlur", "KIT.fx.progressiveBlur(parent, { direction })", `card(root); const f = X.progressiveBlur(root, { direction: 'down', max: 22, from: 0.25, to: 0.9 }); return (p) => f.set(p);`],
  ["blur", "progressiveBlur-radial", "KIT.fx.progressiveBlur(parent, { shape: 'radial' })", `card(root); const f = X.progressiveBlur(root, { shape: 'radial', max: 22, from: 0.2, to: 0.8 }); return (p) => f.set(p);`],
  ["blur", "regionBlur", "KIT.fx.regionBlur(parent, { x, y, w, h })", `card(root); const f = X.regionBlur(root, { x: 140, y: 60, w: 200, h: 140, blur: 0, feather: 18 }); return (p) => f.set({ blur: 16 * p });`],
  ["blur", "zoomBlur", "KIT.fx.zoomBlur(src, { w, h })", canvasFx("zoomBlur(canvas(), { w: W, h: H, parent: root })", "0.3 * p")],
  ["blur", "lensBlur", "KIT.fx.lensBlur(src, { w, h })", canvasFx("lensBlur(canvas(), { w: W, h: H, parent: root })", "14 * p")],
  ["blur", "lightTrail", "KIT.fx.lightTrail(src, { w, h })", canvasFx("lightTrail(canvas(), { w: W, h: H, parent: root })", "{ dx: -200 * p, dy: 0 }")],
  ["blur", "trail", "KIT.fx.trail(parent, make, { layers, lag })", `const f = X.trail(root, (host) => { const b = KIT.el('div', '', host); KIT.css(b, { top: '95px', width: '80px', height: '80px', borderRadius: '18px', background: '#ff5a36' }); return (t) => { b.style.left = (20 + 300 * t / 1.7) + 'px'; }; }, { layers: 4, lag: 0.09, opacity: 0.55 }); return (p) => f.set(0.3 + 1.4 * p);`],
  // fx-distort.js
  ["distort", "chromaticAberration", "KIT.fx.chromaticAberration({ amount, angle })", live("X.chromaticAberration({ amount: 0 })", "{ amount: 12 * p, angle: 0 }")],
  ["distort", "noiseDisplacement", "KIT.fx.noiseDisplacement({ scale, frequency, phase })", live("X.noiseDisplacement({ scale: 0 })", "{ scale: 60 * p, frequency: 0.02, phase: 3 * p }")],
  ["distort", "turbulentDisplace", "KIT.fx.turbulentDisplace({ scale, frequency, phase })", live("X.turbulentDisplace({ scale: 0 })", "{ scale: 60 * p, frequency: 0.02, phase: 3 * p }")],
  ["distort", "cornerPin", "KIT.fx.cornerPin(el, points)", `const c = card(root, { x: 90, y: 50, w: 300, h: 170 }); return (p) => X.cornerPin(c, [[30 * p, 14 * p], [300 - 50 * p, 0], [300, 170 - 40 * p], [0, 170]], { w: 300, h: 170 });`],
  ["distort", "transform", "KIT.fx.transform({ x, skewX, scale, rotate })", `const c = card(root, { x: 120, y: 65, w: 240, h: 135 }); return (p) => { c.style.transform = X.transform({ x: 60 * p, skewX: -20 * p, scale: 1 + 0.3 * p, rotate: 8 * p }); };`],
  ["distort", "barrelDistortion", "KIT.fx.barrelDistortion(src, { w, h })", canvasFx("barrelDistortion(canvas(), { w: W, h: H, parent: root })", "0.9 * p")],
  ["distort", "fisheye", "KIT.fx.fisheye(src, { w, h })", canvasFx("fisheye(canvas(), { w: W, h: H, parent: root })", "p")],
  ["distort", "mirror", "KIT.fx.mirror(src, { axis, at })", `const f = X.mirror(canvas(), { axis: 'x', at: 0.5, w: W, h: H, parent: root }); f.set(); return () => {};`, true],
  ["distort", "tile", "KIT.fx.tile(src, { cols, rows })", canvasFx("tile(canvas(), { w: W, h: H, parent: root })", "{ cols: 2, rows: 2, ox: 80 * p }")],
  ["distort", "wave", "KIT.fx.wave(src, { w, h })", canvasFx("wave(canvas(), { w: W, h: H, parent: root })", "{ amp: 14 * p, length: 60, phase: 6 * p }")],
  // fx-pattern.js
  ["pattern", "checkerboard", "KIT.fx.pattern.checkerboard(parent, { size })", pat("checkerboard(b, { size: 20, color: '#111', bg: '#fff' })", "{ x: 20 * p }")],
  ["pattern", "dotGrid", "KIT.fx.pattern.dotGrid(parent, { size, radius })", pat("dotGrid(b, { size: 30, radius: 7, color: '#ff5a36' })", "{ x: 30 * p, y: 15 * p }")],
  ["pattern", "gridlines", "KIT.fx.pattern.gridlines(parent, { size, width })", pat("gridlines(b, { size: 30, width: 2, color: '#36b3a0' })", "{ x: 30 * p }")],
  ["pattern", "lines", "KIT.fx.pattern.lines(parent, { size, width, angle })", pat("lines(b, { size: 14, width: 4, angle: 45, color: '#3a6ea5' })", "{ x: 14 * p }")],
  ["pattern", "scanlines", "KIT.fx.pattern.scanlines(parent, { size })", `card(root); const f = P.scanlines(mk({}), { size: 6, width: 2, opacity: 0.5 }); return (p) => f.set({ y: 6 * p });`],
  ["pattern", "rings", "KIT.fx.pattern.rings(parent, { size, width })", pat("rings(b, { size: 24, width: 4, color: '#8a4fff' })", "{ x: 0 }")],
  ["pattern", "flannel", "KIT.fx.pattern.flannel(parent, { size, width })", pat("flannel(b, {})", "{ x: 24 * p }", "#d8c8b0")],
  ["pattern", "zigzag", "KIT.fx.pattern.zigzag(parent, { size, width })", pat("zigzag(b, { size: 24, width: 3, color: '#e0a030' })", "{ x: 24 * p }")],
  ["pattern", "waves", "KIT.fx.pattern.waves(parent, { size, height, width })", pat("waves(b, { size: 48, height: 16, width: 3, color: '#3a6ea5' })", "{ x: 48 * p }")],
  ["pattern", "pattern", "KIT.fx.pattern.pattern(parent, { svg, w, h })", pat("pattern(b, { svg: '<circle cx=\"12\" cy=\"12\" r=\"7\" fill=\"#e33\"/><rect x=\"26\" y=\"26\" width=\"8\" height=\"8\" fill=\"#36b3a0\"/>', w: 40, h: 40 })", "{ x: 40 * p, y: 20 * p }")],
  ["pattern", "noise", "KIT.fx.pattern.noise(parent, { frequency, seed })", pat("noise(b, { frequency: 0.05, seed: 3 })", "{ phase: 6 * p }")],
  ["pattern", "fractalNoise", "KIT.fx.pattern.fractalNoise(parent, { frequency, seed })", pat("fractalNoise(b, { frequency: 0.015, seed: 2 })", "{ phase: 6 * p }")],
  ["pattern", "speckle", "KIT.fx.pattern.speckle(parent, { frequency, density })", pat("speckle(b, { density: 0.2 })", "{ phase: 6 * p }")],
  ["pattern", "contourLines", "KIT.fx.pattern.contourLines(parent, { frequency, levels })", pat("contourLines(b, { frequency: 0.006, levels: 8 })", "{ phase: 6 * p }")],
  ["pattern", "liquidContours", "KIT.fx.pattern.liquidContours(parent, { frequency, levels })", pat("liquidContours(b, { frequency: 0.006, levels: 8, color: '#3a6ea5' })", "{ phase: 6 * p }")],
  ["pattern", "paper", "KIT.fx.pattern.paper(parent, { frequency, color })", pat("paper(b, {})", "{ phase: 6 * p }", "#f4efe4")],
  ["pattern", "burlap", "KIT.fx.pattern.burlap(parent, { color })", pat("burlap(b, {})", "{}", "#c9a66b")],
  ["pattern", "whiteNoise", "KIT.fx.pattern.whiteNoise(parent, { size })", pat("whiteNoise(b, { size: 96 })", "{ seed: Math.floor(10 * p) }")],
  ["pattern", "halftone", "KIT.fx.pattern.halftone(parent, { w, h, cell, field })", pat("halftone(b, { w: W, h: H, cell: 14, color: '#ff5a36', field: (u, v, q) => Math.max(0, 1.3 - 2 * Math.hypot(u - 0.5, v - 0.5)) * (0.3 + 0.7 * q) })", "p")],
  ["pattern", "emboss", "KIT.fx.pattern.emboss({ strength })", `const c = card(root); P.emboss({ strength: 1 }).on(c); return () => {};`, true],
  ["pattern", "tvSignalOff", "KIT.fx.pattern.tvSignalOff(parent, { w, h })", `card(root); const f = P.tvSignalOff(root, { w: W, h: H }); return (p) => f.set(p);`],
  // fx-reveal.js
  ["reveal", "irisWipe", "KIT.fx.irisWipe(el, { x, y })", wipe("irisWipe")],
  ["reveal", "radialWipe", "KIT.fx.radialWipe(el, { from })", wipe("radialWipe")],
  ["reveal", "venetianBlinds", "KIT.fx.venetianBlinds(el, { count })", wipe("venetianBlinds", ", { count: 6 }")],
  ["reveal", "pixelDissolve", "KIT.fx.pixelDissolve(el, { cell, seed })", wipe("pixelDissolve", ", { cell: 20, seed: 3 }")],
  ["reveal", "evolve", "KIT.fx.evolve(el, { cell, seed })", wipe("evolve", ", { cell: 30, seed: 5 }")],
  ["reveal", "pixelate", "KIT.fx.pixelate(src, { w, h })", canvasFx("pixelate(canvas(), { w: W, h: H, parent: root })", "1 + 30 * p")],
  ["reveal", "pixelate-progressive", "KIT.fx.pixelate.progressive(src, { axis, max, strip })", canvasFx("pixelate.progressive(canvas(), { w: W, h: H, parent: root, axis: 'y', max: 40, strip: 10 })", "p")],
  ["reveal", "snowFall", "KIT.fx.snowFall(parent, { count, seed })", `const sky = mk({ background: '#1b2a4a' }), f = X.snowFall(sky, { w: W, h: H, count: 90, seed: 2 }); return (p) => f.set(4 * p);`],
  ["reveal", "rainFall", "KIT.fx.rainFall(parent, { count, seed })", `const sky = mk({ background: '#1b2a4a' }), f = X.rainFall(sky, { w: W, h: H, count: 120, seed: 4 }); return (p) => f.set(2 * p);`],
  // fx-gl.js (WebGL2; a source canvas, so these run in the page: no renderer pass needed)
  ["gl", "outline", "KIT.fx.outline(src, { width, color })", canvasFx("outline(sprite(), { w: W, h: H, parent: root })", "{ width: 24 * p, color: '#ff3b6b' }")],
  ["gl", "roughenEdges", "KIT.fx.roughenEdges(src, { amount, border })", canvasFx("roughenEdges(sprite(), { w: W, h: H, parent: root })", "{ amount: p, border: 34 }")],
  ["gl", "shrinkwrap", "KIT.fx.shrinkwrap(src, { amount, displacement })", canvasFx("shrinkwrap(sprite(), { w: W, h: H, parent: root })", "{ amount: p, displacement: 12 * p }")],
  ["gl", "tear", "KIT.fx.tear(src, { progress, jaggedness })", canvasFx("tear(sprite(), { w: W, h: H, parent: root })", "{ progress: 0.9 * p, jaggedness: 26 }")],
  ["gl", "bevelAlpha", "KIT.fx.bevelAlpha(src, { edgeThickness, lightAngle })", canvasFx("bevelAlpha(sprite(), { w: W, h: H, parent: root })", "{ edgeThickness: 14, lightAngle: -90 + 180 * p }")],
  ["gl", "cylinder", "KIT.fx.cylinder(src, { radius, rotationY })", canvasFx("cylinder(sprite(), { w: W, h: H, parent: root })", "{ radius: 130, rotationY: 120 * p }")],
  ["gl", "sphere", "KIT.fx.sphere(src, { radius, rotationY })", canvasFx("sphere(sprite(), { w: W, h: H, parent: root })", "{ radius: 130, rotationY: 160 * p }")],
  ["gl", "pageTurn", "KIT.fx.pageTurn(src, { foldPosition, foldRadius })", canvasFx("pageTurn(sprite(), { w: W, h: H, parent: root })", "{ foldPosition: [0.15 + 0.7 * p, 0.62], foldRadius: 60 }")],
  ["gl", "magnify", "KIT.fx.magnify(src, { size, magnification })", canvasFx("magnify(canvas(), { w: W, h: H, parent: root })", "{ size: 150, magnification: 120 + 260 * p }")],
  ["gl", "thermalVision", "KIT.fx.thermalVision(src, { amount, palette })", canvasFx("thermalVision(canvas(), { w: W, h: H, parent: root })", "{ amount: p }")],
  ["gl", "linearGradient", "KIT.fx.linearGradient(src, { start, end, startColor, endColor })", canvasFx("linearGradient(canvas(), { w: W, h: H, parent: root })", "{ startColor: '#12121c', endColor: '#ffc857', end: [1, 0.5 + 0.5 * p] }")],
  ["gl", "linearGradientTint", "KIT.fx.linearGradientTint(src, { startColor, endColor, amount })", canvasFx("linearGradientTint(canvas(), { w: W, h: H, parent: root })", "{ startColor: '#ff2d55', endColor: '#00ffff', amount: p }")],
  ["gl", "halftoneLinearGradient", "KIT.fx.halftoneLinearGradient(src, { secondStopDotSize, gridSize })", canvasFx("halftoneLinearGradient(canvas(), { w: W, h: H, parent: root })", "{ secondStopDotSize: 46 * p, gridSize: 14, dotColor: '#14161c' }")],
  ["gl", "radialProgressivePixelate", "KIT.fx.radialProgressivePixelate(src, { endBlockSize })", canvasFx("radialProgressivePixelate(canvas(), { w: W, h: H, parent: root })", "{ startBlockSize: 1, endBlockSize: 1 + 34 * p }")],
  ["gl", "uvTranslate", "KIT.fx.uvTranslate(src, { u, v })", canvasFx("uvTranslate(canvas(), { w: W, h: H, parent: root })", "{ u: 0.2 * p, v: 0.08 * p }")],
  ["gl", "shatter", "KIT.fx.shatter(src, { time, pattern, repetitions })", canvasFx("shatter(canvas(), { w: W, h: H, parent: root })", "{ time: 1.4 * p, pattern: 'bricks', repetitions: 8, seed: 2 }")],
  ["gl", "lightning", "KIT.fx.lightning(src, { conductivityState, origin, direction })", canvasFx("lightning(canvas(), { w: W, h: H, parent: root })", "{ conductivityState: 1 + Math.floor(6 * p), origin: [0.2, 0], direction: [0.7, 1] }")],
];

// run in the page: the shared test picture (a card of DOM, and the same picture drawn on a canvas for the canvas effects)
export const FX_RUNTIME = `
window.G = (() => {
  const W = 480, H = 270, X = KIT.fx, P = X.pattern, CARD = 'linear-gradient(135deg,#ff7a59 0%,#ffc857 35%,#36b3a0 70%,#3a6ea5 100%)';
  const mk = (css, parent) => { const e = KIT.el('div', '', parent || window.__root); KIT.css(e, Object.assign({ left: '0px', top: '0px', width: W + 'px', height: H + 'px' }, css)); return e; };
  const card = (parent, o = {}) => { const w = o.w || W, h = o.h || H, e = mk({ left: (o.x || 0) + 'px', top: (o.y || 0) + 'px', width: w + 'px', height: h + 'px', background: CARD, overflow: 'hidden' }, parent);
    e.innerHTML = '<div style="left:' + w * 0.08 + 'px;top:' + h * 0.16 + 'px;font:800 ' + h * 0.2 + 'px Arial,sans-serif;color:#fff;white-space:nowrap">Reelwright</div>' +
      '<div style="left:' + w * 0.08 + 'px;top:' + h * 0.5 + 'px;width:' + w * 0.5 + 'px;height:' + h * 0.05 + 'px;background:#fff;border-radius:99px"></div>' +
      '<div style="left:' + w * 0.7 + 'px;top:' + h * 0.58 + 'px;width:' + h * 0.28 + 'px;height:' + h * 0.28 + 'px;border-radius:50%;background:#14161c"></div>' +
      '<div style="left:' + w * 0.1 + 'px;top:' + h * 0.68 + 'px;font:600 ' + h * 0.09 + 'px Arial,sans-serif;color:#14161c;white-space:nowrap">scenes from code</div>'; return e; };
  const canvas = (bg) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); } else { const l = g.createLinearGradient(0, 0, W, H); [[0, '#ff7a59'], [0.35, '#ffc857'], [0.7, '#36b3a0'], [1, '#3a6ea5']].forEach(([s, col]) => l.addColorStop(s, col)); g.fillStyle = l; g.fillRect(0, 0, W, H); }
    g.fillStyle = bg ? '#d22' : '#fff'; g.font = '800 54px Arial,sans-serif'; g.textBaseline = 'top'; g.fillText('Reelwright', 38, 43);
    g.fillRect(38, 135, 240, 14); g.fillStyle = '#14161c'; g.beginPath(); g.arc(380, 190, 38, 0, 6.2832); g.fill(); g.font = '600 24px Arial,sans-serif'; g.fillText('scenes from code', 48, 184); return c; };
  // sprite: the same picture on a transparent canvas, for the effects that work on the silhouette (outline, roughenEdges, tear, pageTurn)
  const sprite = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    const l = g.createLinearGradient(0, 0, W, H); [[0, '#ff7a59'], [0.35, '#ffc857'], [0.7, '#36b3a0'], [1, '#3a6ea5']].forEach(([s, col]) => l.addColorStop(s, col));
    g.fillStyle = l; g.beginPath(); g.arc(W / 2, H / 2, H * 0.42, 0, 6.2832); g.fill();
    g.fillStyle = '#14161c'; g.font = '800 46px Arial,sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText('Reelwright', W / 2, H / 2); return c; };
  return { W, H, X, P, mk, card, canvas, sprite };
})();
window.runFx = (body) => { if (window.__root) window.__root.remove(); window.__root = KIT.el('div', '', KIT.stage); KIT.css(window.__root, { left: '0px', top: '0px', width: '480px', height: '270px', overflow: 'hidden' });
  const G = window.G; window.__f = new Function('G', 'root', 'const { X, P, card, canvas, sprite, mk, W, H } = G; ' + body)(G, window.__root); };
window.stepFx = (p) => window.__f(p);
`;
