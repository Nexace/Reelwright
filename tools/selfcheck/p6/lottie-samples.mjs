// Lottie JSON made here (no third-party file), one per feature the P6 rows name; used by tools/selfcheck/p6-lottie.mjs and
// p6-lottie-lint.mjs. 320x180, 30 fps, 60 frames (2 s). Hand-written bodymovin structure; docs/playbook/lottie.md lists what
// each one proved.
const st = (v) => ({ a: 0, k: v });
const kf = (a, b, t1 = 60) => ({ a: 1, k: [{ t: 0, s: a, i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } }, { t: t1, s: b }] });
const tr = (o = {}) => ({ ty: "tr", p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), ...o });
const fill = (c) => ({ ty: "fl", c: st(c), o: st(100) });
const rect = (w, h, r = 0) => ({ ty: "rc", p: st([0, 0]), s: st([w, h]), r: st(r) });
const grp = (...it) => ({ ty: "gr", it: [...it, tr()] });
const layer = ({ ks = {}, ...o }) => ({ ddd: 0, ind: 1, ty: 4, nm: "l", sr: 1, ao: 0, ip: 0, op: 60, st: 0, bm: 0,
  ks: { o: st(100), r: st(0), p: st([160, 90, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), ...ks }, ...o });
const file = (layers, extra = {}) => ({ v: "5.7.0", fr: 30, ip: 0, op: 60, w: 320, h: 180, ddd: 0, assets: [], layers: layers.map((l, i) => ({ ...l, ind: i + 1 })), ...extra });
const Z4 = [[0, 0], [0, 0], [0, 0], [0, 0]];
const GREEN = [0.18, 0.62, 0.42, 1], RED = [0.85, 0.2, 0.2, 1], BLUE = [0.2, 0.4, 0.8, 1], GOLD = [0.95, 0.7, 0.2, 1];

const svgImg = "data:image/svg+xml;base64," + Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='#c33'/><circle cx='50' cy='50' r='30' fill='#fc3'/></svg>").toString("base64");

export const samples = {
  // the shape sample of tools/selfcheck/runtimes.mjs, also run with renderer "html" (row 5.3)
  shapes: file([layer({ nm: "box", ks: { o: kf([30], [100]), r: kf([0], [270]), p: kf([60, 90, 0], [260, 90, 0]) }, shapes: [grp(rect(70, 70, 14), fill(GREEN))] })]),

  // a themeable animation (dotLottie theme slot "box_color": the fill colour), for tools/selfcheck/p6-dotlottie.mjs
  themed: file([layer({ nm: "box", ks: { p: st([160, 90, 0]), r: kf([0], [90]) }, shapes: [grp(rect(120, 120, 14), { ty: "fl", c: { a: 0, k: GREEN, sid: "box_color" }, o: st(100) })] })],
    { slots: { box_color: { p: { a: 0, k: GREEN } } } }),

  // expression strings (row 5.5): time-driven only, so they are deterministic
  expressions: file([layer({ nm: "expr", ks: {
    r: { a: 0, k: 0, x: "var $bm_rt;\n$bm_rt = $bm_mul(time, 180);" },
    p: { a: 0, k: [160, 90, 0], x: "var $bm_rt;\n$bm_rt = [$bm_sum(value[0], $bm_mul(Math.sin($bm_mul(time, 3)), 60)), value[1]];" },
  }, shapes: [grp(rect(70, 70, 14), fill(BLUE))] })]),

  // wiggle / random: lottie-web evaluates them with Math.random-backed noise (see the self-check): must be flagged
  wiggle: file([layer({ nm: "wig", ks: { p: { a: 0, k: [160, 90, 0], x: "var $bm_rt;\n$bm_rt = wiggle(3, 40);" } }, shapes: [grp(rect(70, 70, 14), fill(RED))] })]),
  random: file([layer({ nm: "rnd", ks: { r: { a: 0, k: 0, x: "var $bm_rt;\n$bm_rt = random(0, 90);" } }, shapes: [grp(rect(70, 70, 14), fill(RED))] })]),

  // text layer (row 5.6): a static string whose fill and size are keyed
  text: file([{ ddd: 0, ind: 1, ty: 5, nm: "Hello", sr: 1, ao: 0, ip: 0, op: 60, st: 0, bm: 0,
    ks: { o: st(100), r: st(0), p: st([160, 110, 0]), a: st([0, 0, 0]), s: kf([60, 60, 100], [110, 110, 100]) },
    t: { d: { k: [{ s: { s: 48, f: "Arial", t: "Hi Lottie", ca: 0, j: 2, tr: 0, lh: 58, ls: 0, fc: [0.1, 0.4, 0.8] }, t: 0 }] }, p: {}, m: { g: 1, a: st([0, 0]) }, a: [] } }],
  { fonts: { list: [{ fName: "Arial", fFamily: "Arial", fStyle: "Regular", ascent: 74 }] },
    // lottie-web draws text from exported glyph outlines (`chars`), never from a system font: one box per letter here
    chars: [..."HiLote"].map((ch, i) => ({ ch, size: 48, style: "Regular", w: 60, fFamily: "Arial",
      data: { shapes: [{ ty: "gr", it: [{ ind: 0, ty: "sh", ks: { a: 0, k: { i: Z4, o: Z4, v: [[5, 0], [45, 0], [45, -(40 + i * 8)], [5, -(40 + i * 8)]], c: true } } }] }] } }))
      .concat([{ ch: " ", size: 48, style: "Regular", w: 30, fFamily: "Arial", data: {} }]) }),

  // image asset, mask, track matte, gradient fill, trim path, repeater, effect (row 5.7), one layer each
  features: file([
    // 1 image asset, turning
    { ddd: 0, ind: 1, ty: 2, nm: "img", refId: "im0", sr: 1, ao: 0, ip: 0, op: 60, st: 0, bm: 0,
      ks: { o: st(100), r: kf([0], [90]), p: st([50, 45, 0]), a: st([50, 50, 0]), s: st([40, 40, 100]) } },
    // 2 mask: a gold square clipped by an animated ellipse mask
    layer({ nm: "mask", ks: { p: st([140, 45, 0]) }, hasMask: true,
      masksProperties: [{ inv: false, mode: "a", pt: { a: 1, k: [{ t: 0, s: [{ i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]], v: [[-10, -10], [10, -10], [10, 10], [-10, 10]], c: true }], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
        { t: 60, s: [{ i: [[0, 0], [0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0], [0, 0]], v: [[-35, -35], [35, -35], [35, 35], [-35, 35]], c: true }] }] }, o: st(100), x: st(0), nm: "M1" }],
      shapes: [grp(rect(70, 70), fill(GOLD))] }),
    // 3 track matte: red square shown through a moving circle (the matte layer comes first, td = 1)
    layer({ nm: "matte", td: 1, ks: { p: kf([200, 45, 0], [260, 45, 0]) }, shapes: [grp({ ty: "el", p: st([0, 0]), s: st([50, 50]) }, fill([1, 1, 1, 1]))] }),
    layer({ nm: "matted", tt: 1, ks: { p: st([230, 45, 0]) }, shapes: [grp(rect(90, 60), fill(RED))] }),
    // 4 gradient fill
    layer({ nm: "grad", ks: { p: st([60, 135, 0]) }, shapes: [grp(rect(80, 60, 8), { ty: "gf", o: st(100), r: 1, t: 1, s: st([-40, 0]), e: st([40, 0]), g: { p: 2, k: st([0, 1, 0.8, 0.2, 1, 0.2, 0.4, 0.9]) } })] }),
    // 5 trim path: a stroked arc drawing on
    layer({ nm: "trim", ks: { p: st([140, 135, 0]) }, shapes: [grp({ ty: "el", p: st([0, 0]), s: st([60, 60]) },
      { ty: "st", c: st(BLUE), o: st(100), w: st(8), lc: 2, lj: 2 }, { ty: "tm", s: st(0), e: kf([0], [100]), o: st(0), m: 1 })] }),
    // 6 repeater: 4 copies of a dot, offset
    layer({ nm: "rep", ks: { p: st([210, 135, 0]) }, shapes: [grp({ ty: "el", p: st([0, 0]), s: st([14, 14]) }, fill(GREEN),
      { ty: "rp", c: st(4), o: st(0), m: 1, tr: { ty: "tr", p: st([20, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), so: st(100), eo: kf([100], [20]) } })] }),
    // 7 effect: a fill effect turns a grey square red (effect type 21)
    layer({ nm: "fx", ks: { p: st([285, 135, 0]) }, shapes: [grp(rect(40, 40), fill([0.5, 0.5, 0.5, 1]))],
      ef: [{ ty: 21, nm: "Fill", np: 9, mn: "ADBE Fill", ix: 1, en: 1, ef: [
        { ty: 10, nm: "Fill Mask", mn: "ADBE Fill-0001", ix: 1, v: st(0) }, { ty: 7, nm: "All Masks", mn: "ADBE Fill-0007", ix: 2, v: st(0) },
        { ty: 2, nm: "Color", mn: "ADBE Fill-0002", ix: 3, v: { a: 1, k: [{ t: 0, s: [1, 0, 0, 1], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } }, { t: 60, s: [0, 0.6, 1, 1] }] } },
        { ty: 7, nm: "Invert", mn: "ADBE Fill-0006", ix: 4, v: st(0) }, { ty: 0, nm: "Horizontal Feather", mn: "ADBE Fill-0003", ix: 5, v: st(0) },
        { ty: 0, nm: "Vertical Feather", mn: "ADBE Fill-0004", ix: 6, v: st(0) }, { ty: 0, nm: "Opacity", mn: "ADBE Fill-0005", ix: 7, v: st(1) }] }] }),
  ], { assets: [{ id: "im0", w: 100, h: 100, u: "", p: svgImg, e: 1 }] }),
};
