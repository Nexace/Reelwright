# Timeline travel

A camera travelling a long timeline: it flies to each event, zooms in to dwell on it, zooms out to move on.

Source: video-shotcraft card `timeline-travel` (shots: timeline-travel). Helper: `KIT.shotcards` in `tools/shotcards/data.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs data` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A company or product history with 3-6 milestones, one per narration beat.
- Any sequence on a line where the distance between events is part of the story.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `data.js` first, see the index):

```js
const tl = KIT.shotcards.timelineTravel({ events: [{ label: 'Founded', date: '2019' }, { label: 'Seed', date: '2021' }, { label: 'v1.0', date: '2023' }],
  at: snap(W('t', 'story')), flight: KIT.dur(0.9), dwell: KIT.dur(0.8) });
function render(t) { tl.set(t); }
```

## Timing and easing

- Event i is reached at `at + i·(flight + dwell) + flight`; `tl.cam(t)` is the camera x in strip pixels. Pass `flight` and `dwell` from the gaps between the spoken years if the voice leads.
- Flights are inOut eases and the dwell is held, so the camera is still when the label is read.

## Common mistakes

- Even spacing for uneven dates: the strip is evenly spaced (`spacing`); put the real dates in the labels, not in the distances.
- More than about 7 events: the dwell time per event gets too short to read.

[Back to the shotcard index](b-index.md)
