// Runtimes demo: each library is paused at load and seeked from render(t) (tools/runtimes.js), so frames can render in
// any order on any page. 1 "libs": GSAP SplitText title + DrawSVG underline, a Lottie made here, anime.js dots;
// 2 "three": a Three.js knot; 3 "end": a CSS @keyframes ring. Every time comes from V/W/snap.
'use strict';
const { el, css, show, win, V, W, snap, cue } = KIT, S = KIT.safe, u = KIT.u;
const CX = S.x + S.w / 2, DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const IN2 = snap(V('three').start - KIT.dur(0.3)), IN3 = snap(V('end').start - KIT.dur(0.3)), F = KIT.dur(0.35);
const tag = (text, x, y) => { const e = el('div', 'tag', scene1, text); css(e, { left: x + 'px', top: y + 'px' }); return e; };
const rgb = (() => { const p = el('i'); p.style.color = 'var(--kit-accent)'; const c = getComputedStyle(p).color.match(/[\d.]+/g).map(Number); p.remove(); return c; })();

// ── 1. libs ──────────────────────────────────────────────────────────────
const scene1 = el('div');
css(scene1, { position: 'absolute', inset: 0 });
const title = el('div', 'title', scene1, 'Seekable runtimes');
const TY = S.y + S.h * 0.3;
css(title, { left: CX - title.offsetWidth / 2 + 'px', top: TY - title.offsetHeight / 2 + 'px' });
const NS = 'http://www.w3.org/2000/svg', line = document.createElementNS(NS, 'svg');
const LW = title.offsetWidth, LY = TY + title.offsetHeight / 2 + 18 * u;
line.setAttribute('width', LW); line.setAttribute('height', 40 * u);
line.innerHTML = `<path d="M4 ${24 * u} C ${LW * 0.3} ${4 * u}, ${LW * 0.6} ${36 * u}, ${LW - 4} ${14 * u}" fill="none" stroke="var(--kit-accent)" stroke-width="${8 * u}" stroke-linecap="round"/>`;
css(line, { position: 'absolute', left: CX - LW / 2 + 'px', top: LY + 'px' });
scene1.appendChild(line);

const COL = [1, 3, 5].map((k) => S.x + (S.w * k) / 6), RY = S.y + S.h * 0.66, TAGY = S.y + S.h * 0.8;
const T_GSAP = snap(W('libs', 'GSAP')), T_LOT = snap(W('libs', 'Lottie')), T_ANI = snap(W('libs', 'anime'));
cue(T_GSAP, 'pop'); cue(T_LOT, 'pop'); cue(T_ANI, 'pop');
const gsapK = KIT.gsap((tl) => {
  const chars = new SplitText(title, { type: 'chars' }).chars;
  tl.fromTo(chars, { yPercent: 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: KIT.dur(0.5), stagger: { each: 0.03, from: 'center' }, ease: 'back.out(2)' }, 0.05);
  tl.fromTo(line.firstChild, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: KIT.dur(0.7), ease: 'power2.inOut' }, T_GSAP);
});
const gTag = tag('GSAP', COL[0], TAGY);
const gBar = el('div', 'dot', scene1);
css(gBar, { left: COL[0] - 17 * u + 'px', top: RY - 17 * u + 'px', borderRadius: 8 * u + 'px' });

// a Lottie made here (no third-party file): a rounded square that turns and grows, in the theme's accent
const kf = (a, b, t1) => ({ a: 1, k: [{ t: 0, s: a, i: { x: [0.3], y: [1] }, o: { x: [0.6], y: [0] } }, { t: t1, s: b }] });
const LOT = { v: '5.7.0', fr: 30, ip: 0, op: 45, w: 200, h: 200, ddd: 0, assets: [], layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'box', sr: 1, ao: 0, ip: 0, op: 45, st: 0, bm: 0,
  ks: { o: kf([0], [100], 12), r: kf([-90], [180], 45), p: { a: 0, k: [100, 100, 0] }, a: { a: 0, k: [0, 0, 0] }, s: kf([20, 20, 100], [100, 100, 100], 30) },
  shapes: [{ ty: 'gr', it: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [110, 110] }, r: { a: 0, k: 26 } },
    { ty: 'st', c: { a: 0, k: [...rgb.slice(0, 3).map((v) => v / 255), 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 14 }, lc: 2, lj: 2 },
    { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] }] }] };
const lotBox = el('div', '', scene1), LS = 200 * u;
css(lotBox, { position: 'absolute', left: COL[1] - LS / 2 + 'px', top: RY - LS / 2 + 'px', width: LS + 'px', height: LS + 'px' });
const lot = KIT.lottie(lotBox, LOT, { t0: T_LOT });
const lTag = tag('Lottie', COL[1], TAGY);

const DOTS = 7, dots = [];
for (let i = 0; i < DOTS; i++) {
  const d = el('div', 'dot an', scene1);
  css(d, { left: COL[2] + (i - (DOTS - 1) / 2) * 46 * u - 17 * u + 'px', top: RY - 17 * u + 'px' });
  dots.push(d);
}
const ani = KIT.anime((A) => {
  const tl = A.createTimeline({ autoplay: false });
  tl.add(dots, { opacity: [0, 1], scale: [0.2, 1], duration: KIT.dur(0.4) * 1000, delay: A.stagger(50, { from: 'center' }), ease: 'outBack(2)' }, T_ANI * 1000);
  tl.add(dots, { translateY: [{ to: -60 * u, duration: 260 }, { to: 0, duration: 420 }], delay: A.stagger(70), ease: 'inOutSine' }, (T_ANI + KIT.dur(0.45)) * 1000);
  return tl;
});
const aTag = tag('anime.js', COL[2], TAGY);

// ── 2. three ─────────────────────────────────────────────────────────────
const scene2 = el('div');
css(scene2, { position: 'absolute', inset: 0 });
const three = KIT.three(scene2, (THREE, renderer, { w, h }) => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
  camera.position.set(0, 0, 11);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 5, 6); scene.add(key);
  const color = new THREE.Color(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.3, 0.38, 200, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 }));
  scene.add(knot);
  return { scene, camera, update: (t) => {
    const p = t - IN2;
    knot.rotation.set(p * 0.7, p * 1.1, 0);
    knot.scale.setScalar(0.6 + 0.4 * KIT.ease(KIT.seg(p, 0, KIT.dur(0.8))));
  } };
});
const tTag = el('div', 'tag', scene2, 'Three.js');
css(tTag, { left: CX + 'px', top: S.y + S.h * 0.86 + 'px' });
cue(IN2, 'whoosh');

// ── 3. end: a CSS @keyframes ring, its delay from the VO ─────────────────
const scene3 = el('div');
css(scene3, { position: 'absolute', inset: 0 });
const RS = 440 * u, ring = el('div', 'ring', scene3);
css(ring, { position: 'absolute', left: CX - RS / 2 + 'px', top: S.y + S.h * 0.42 - RS / 2 + 'px', width: RS + 'px', height: RS + 'px', boxSizing: 'border-box',
  animationDelay: IN3 + 's' });
const endT = el('div', 'title', scene3, 'render(t)');
endT.style.fontSize = 64 * u + 'px';
css(endT, { left: CX - endT.offsetWidth / 2 + 'px', top: S.y + S.h * 0.42 - endT.offsetHeight / 2 + 'px' });
const cTag = el('div', 'tag', scene3, 'CSS @keyframes');
css(cTag, { left: CX + 'px', top: S.y + S.h * 0.42 + RS / 2 + 36 * u + 'px' });
cue(IN3, 'impact');

const subs = KIT.subtitles(['libs', 'three', 'end']);
css(subs.box, { bottom: KIT.H_ - S.y - S.h + 'px' });

function render(t) {
  show(scene1, win(t, 0, IN2 + F, 0.01, F));
  gsapK.set(t);
  lot.set(t);
  ani.set(t);
  const pop = (e, at) => show(e, KIT.ease(KIT.seg(t, at, at + KIT.dur(0.3))));
  pop(gTag, T_GSAP); pop(gBar, T_GSAP); pop(lTag, T_LOT); pop(aTag, T_ANI);
  css(gBar, { transform: `scaleX(${1 + 2.2 * KIT.ease(KIT.seg(t, T_GSAP, T_GSAP + KIT.dur(0.6)))})` });
  show(scene2, win(t, IN2, IN3 + F, F, F));
  three.set(t);
  show(scene3, win(t, IN3, DUR, F, KIT.dur(0.5)));
  KIT.animations(t);
  subs.set(t);
}
KIT.start({ dur: DUR, render });
