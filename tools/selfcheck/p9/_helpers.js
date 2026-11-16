// shared by the p9 fixtures (not a fixture itself: the harness only reads *.mjs). px(page, x, y) → [r, g, b, a] of one screenshot pixel;
// at(page, t) renders t in the page (pvk window.render, awaited).
export const px = async (p, x, y) => {
  const b = await p.screenshot({ type: "png", clip: { x, y, width: 1, height: 1 } });
  return p.evaluate(async (b64) => {
    const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
    const g = new OffscreenCanvas(1, 1).getContext("2d"); g.drawImage(im, 0, 0); return [...g.getImageData(0, 0, 1, 1).data];
  }, b.toString("base64"));
};
export const at = (p, t) => p.evaluate((t) => window.render(t), t);
export const near = (a, b, e) => Math.abs(a - b) <= e;
// grab(page, x, y, w, h) → flat RGBA array of that screenshot rectangle
export const grab = async (p, x, y, w, h) => {
  const b = await p.screenshot({ type: "png", clip: { x, y, width: w, height: h } });
  return p.evaluate(async (b64) => {
    const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
    const g = new OffscreenCanvas(im.width, im.height).getContext("2d"); g.drawImage(im, 0, 0);
    return [...g.getImageData(0, 0, im.width, im.height).data];
  }, b.toString("base64"));
};
// region(page, x, y, w, h) → { mean, std } of the luminance of that screenshot rectangle (std ≈ how sharp a stripe pattern still is)
export const region = async (p, x, y, w, h) => {
  const b = await p.screenshot({ type: "png", clip: { x, y, width: w, height: h } });
  return p.evaluate(async (b64) => {
    const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode();
    const g = new OffscreenCanvas(im.width, im.height).getContext("2d"); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, im.width, im.height).data; let s = 0, s2 = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; s += l; s2 += l * l; }
    return { mean: s / n, std: Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)) };
  }, b.toString("base64"));
};
