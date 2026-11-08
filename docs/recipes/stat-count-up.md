# Stat with count-up

One number that matters, counting up on the spoken number, with the "Illustrative data" label.

![Stat with count-up](img/stat-count-up.jpg)

## When to use

- One figure per scene: a percentage, a multiple, a time saved. The label says what the number measures.
- Any made-up number. Real numbers from a real source get a visible `Source: …` credit instead of the label (PLAYBOOK, Truthfulness).

## The code

This is the scene from `docs/recipes/film/` (scene 3 of 8), unchanged.

**film.js** (after the shared setup, see the [README](README.md#shared-setup)):

```js
const stat = L.stat({ ...span(2), value: 40, suffix: '%', label: 'faster to ship, per team',
  at: snap(W('stat', 'forty')), note: 'Illustrative data' });                  // counts up from the beat nearest "forty"
cue(snap(W('stat', 'forty')), 'riser', 0.6);

function render(t) {
  stat.set(t);
  // …the other scenes' set(t) calls
}
```

## Timing and easing

- `at: snap(W('stat', 'forty'))` starts the count on the beat nearest the word "forty", so the number is rising as the voice says it. It runs for `KIT.dur(1.4)` with `outExpo`: most of the climb is in the first half second, then it settles on 40.
- The layout measures the *final* value to size the text, so the number never reflows while it counts.
- `note: 'Illustrative data'` puts the label under the safe box; the `illustrative` QA gate fails a film that shows 40% without it.
- A `riser` cue on the same beat gives the count a sound; one sound per scene is enough.

## Common mistakes

- Counting up from the scene's `in` instead of the spoken word: the number has finished before it is said.
- Leaving off `note` for made-up data: `qa` fails the build.
- Two numbers in one scene: use [chart-grows](chart-grows.md) or a bento layout.

[Back to the index](README.md)
