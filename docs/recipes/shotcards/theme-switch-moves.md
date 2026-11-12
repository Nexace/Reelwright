# Theme switch: sweep toggle and palette ripple

The same scene built twice, the second copy with other --kit-* colours, revealed by a diagonal wipe after a toggle flips, or by a circular ripple from a palette swatch.

Source: video-shotcraft card `theme-switch-moves` (shots: theme-sweep-toggle, palette-theme-ripple). Helper: `KIT.shotcards` in `tools/shotcards/interaction.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs interaction` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- Light and dark in one shot (`kind: 'sweep'`).
- Re-theming a UI from a colour choice (`kind: 'ripple'`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `interaction.js` first, see the index):

```js
const sw = KIT.shotcards.themeSwitch({
  build: (parent) => { /* build your scene into parent; return { set(t) } if it animates */ return scene(parent); },
  theme: { '--kit-bg': '#f6f4ef', '--kit-ink': '#1d1b16', '--kit-accent': '#e11d48' },
  kind: 'sweep', from: { x: 1700, y: 120 }, at: snap(W('t', 'dark')) });
function render(t) { sw.set(t); }
```

## Timing and easing

- A toggle (or the palette pick) takes `lead` = 0.5 s, then the reveal takes `dur` = 0.9 s on a `power2.inOut` ease: a 130 % polygon edge for the sweep, `circle(r at from)` for the ripple.
- `build` is called twice, so anything random in it must come from a seeded source. `sw.base` and `sw.alt` are the two layers.

## Common mistakes

- Hard-coded colours in the scene: only `var(--kit-*)` colours change in the second copy.
- Building the scene with ids: the copy duplicates them; use classes.

[Back to the shotcard index](b-index.md)
