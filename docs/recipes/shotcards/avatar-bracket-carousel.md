# Avatar bracket carousel

Avatars on a carousel with [ ] brackets that pinch in on the centre one every step.

Source: video-shotcraft card `avatar-bracket-carousel` (shots: avatar-bracket-carousel). Helper: `KIT.shotcards` in `tools/shotcards/ui-entrance.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs ui-entrance` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A team, customers or testimonials one at a time.
- Social proof without photos: initials on colour.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `ui-entrance.js` first, see the index):

```js
const crowd = KIT.shotcards.avatarBracketCarousel({ avatars: [{ label: 'A' }, { label: 'B' }, { label: 'C' }, { label: 'D' }], every: KIT.beat(2) - KIT.beat(0), at: KIT.beat(4) });
function render(t) { crowd.set(t); }
```

## Timing and easing

- Each step the row moves one place (`back.out(1.3)`, last 0.5 s of `every`); the brackets pinch by 10 % of an avatar during the move and settle open.
- The centre avatar scales to 1.2, the neighbours 0.7-1.0.

## Common mistakes

- Real photos from the network: use local images in the avatars' `label` HTML (the `no-network` gate).
- Fewer than 5 avatars: the ring shows the same face twice.

[Back to the shotcard index](b-index.md)
