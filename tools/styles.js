// styles.js: style objects as pure functions of t (Remotion's @remotion/animation-utils shapes) and crop ratios. Load after timing.js.
//   KIT.interpolateStyles(t, input, [styleA, styleB, …], { easing, left, right, posterize }) → one style object
//     every style has the same keys; each key goes through KIT.interpolate (numbers, "20deg", "0px 0px", colours, transform strings). A `transform`
//     given as an array is built with makeTransform first. Apply it with KIT.css(el, styles).
//   KIT.makeTransform([{ rotate: 45 }, { translateX: 10 }, { scale: 1.5 }, { translate: [10, 20] }, { rotate: '0.5turn' }]) → 'rotate(45deg) translateX(10px) scale(1.5) translate(10px, 20px) …'
//     a number gets the unit of its function (px for translate* / perspective, deg for rotate* / skew*, none for scale* / matrix*); a string is kept as written.
//   KIT.crop(el, { left, right, top, bottom }) → the clip-path it set: ratios 0..1 of the element's own box cut away from each side (Remotion's cropLeft … cropBottom).
'use strict';
(function () {
  const K = window.KIT;
  if (!K || !K.interpolate) throw new Error('styles.js: load tools/timing.js first');
  const unit = (fn) => (/^(translate|perspective)/.test(fn) ? 'px' : /^(rotate|skew)/.test(fn) ? 'deg' : '');
  K.makeTransform = (list) => list.flatMap((item) => Object.entries(item).map(([fn, v]) => {
    const u = unit(fn), arg = (x) => (typeof x === 'number' ? x + u : String(x));
    return `${fn}(${(Array.isArray(v) ? v : [v]).map(arg).join(', ')})`;
  })).join(' ');
  K.interpolateStyles = (t, input, styles, o = {}) => {
    if (!Array.isArray(styles) || styles.length !== input.length) throw new Error('interpolateStyles: styles needs one object per input value');
    const keys = Object.keys(styles[0]);
    styles.forEach((s, i) => { if (Object.keys(s).length !== keys.length || keys.some((k) => !(k in s))) throw new Error(`interpolateStyles: style ${i} does not have the same keys as style 0 (${keys.join(', ')})`); });
    const out = {};
    for (const k of keys) out[k] = K.interpolate(t, input, styles.map((s) => (k === 'transform' && Array.isArray(s[k]) ? K.makeTransform(s[k]) : s[k])), o);
    return out;
  };
  K.crop = (el, { left = 0, right = 0, top = 0, bottom = 0 } = {}) => {
    const c = { top, right, bottom, left };
    for (const k in c) if (!(c[k] >= 0 && c[k] <= 1)) throw new Error(`crop: ${k} is a ratio from 0 to 1, not ${c[k]}`);
    if (left + right > 1 || top + bottom > 1) throw new Error('crop: left + right and top + bottom can each be at most 1');
    const v = `inset(${[top, right, bottom, left].map((x) => +(x * 100).toFixed(4) + '%').join(' ')})`;
    el.style.clipPath = v; el.style.webkitClipPath = v;
    return v;
  };
})();
