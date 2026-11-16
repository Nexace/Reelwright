# Live chart moves

Three chart moves that read as live data: a scrolling oscilloscope trace, a dot swarm regrouping into counts, and an axis that rescales when an outlier lands.

Source: video-shotcraft card `chart-live-moves` (shots: oscilloscope-stream, unit-dot-swarm-regroup, axis-rescale-shock). Helper: `KIT.shotcards` in `tools/shotcards/data.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs data` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A heartbeat or signal behind a headline (`oscilloscopeStream`).
- Turning a crowd into categories (`unitDotSwarmRegroup`), or a surprise number (`axisRescaleShock`).

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `data.js` first, see the index):

```js
const scope = KIT.shotcards.oscilloscopeStream({ at: 0, dur: KIT.dur(3) });
const swarm = KIT.shotcards.unitDotSwarmRegroup({ groups: [{ label: 'Free', count: 24 }, { label: 'Pro', count: 12 }, { label: 'Team', count: 6 }], regroupAt: snap(W('s', 'split')) });
const shock = KIT.shotcards.axisRescaleShock({ values: [40, 55, 48, 62, 300], shockAt: snap(W('s', 'outlier')) });   // Illustrative data
function render(t) { scope.set(t); swarm.set(t); shock.set(t); }
```

## Timing and easing

- `oscilloscopeStream`: `speed` is screens per second; the trace is closed form in t, so a seek never shows a different wave.
- `unitDotSwarmRegroup`: dots leave one after another over about 0.6 s, each on its own ease; at most 400 dots.
- `axisRescaleShock`: at `shockAt` the axis maximum jumps from `max[0]` to `max[1]` on an underdamped spring; the frame shakes and decays; `shock.axisMax(t)` is the live maximum.

## Common mistakes

- More than a few hundred dots: use bars instead.
- Forgetting the "Illustrative data" label on made-up numbers (the `illustrative` QA gate fails the build).

[Back to the shotcard index](b-index.md)
