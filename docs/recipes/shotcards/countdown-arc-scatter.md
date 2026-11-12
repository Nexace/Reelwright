# Countdown arc with scatter exit

3, 2, 1 inside a ring that drains each second; then a word pops and scatters in pieces.

Source: video-shotcraft card `countdown-arc-scatter` (shots: countdown-arc-scatter). Helper: `KIT.shotcards` in `tools/shotcards/typography.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs typography` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A launch or a reveal that needs a beat of anticipation.
- Counting to a word (`exit: 'GO'`) or a product name.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `typography.js` first, see the index):

```js
const count = KIT.shotcards.countdownArcScatter({ from: 3, per: KIT.beat(1) - KIT.beat(0), at: KIT.beat(4), exit: 'GO' });
KIT.cue(count.end - KIT.dur(1.3), 'riser', 0.7);
function render(t) { count.set(t); }
```

## Timing and easing

- Each step lasts `per`; its digit pops from 1.35× in 0.25·per; the arc drains from full to empty. After the last step the exit word pops (0.18 s), holds `hold` (0.8·per), then letters and 28 dots scatter over `scatter` (0.8 s, seeded).
- Set `per` to one beat so the digits land on the music.

## Common mistakes

- More than 5 steps: the ring repeats and bores. Count from 3.
- An exit word longer than 8 letters: the pieces scatter off screen before it is read.

[Back to the shotcard index](b-index.md)
