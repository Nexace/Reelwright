# Lyric video

A song with its lyrics as big type, one line at a time, every line landing on the beat. The track sets the clock: `beatgrid` gives the bar times, the lyric lines live in `film.js` (they are sung, not spoken, so they are not voiceover lines).

## When to use

- Music-led films: a track, its words, a simple look.
- Use a track you have the rights to. The repo ships none.

## 1. Fit the beat grid

```bash
./video.sh new lyrics --renderer hyperframes
cp song.mp3 projects/lyrics/music/track.mp3
./video.sh beatgrid lyrics        # prints every bar start with its loudness, writes music/grid.json
```

Set `"music": { "start": <a bar time> }` in `project.json` to the bar where the first lyric should begin (README, music section, step 3). `KIT.beat(k)`, `KIT.snap(t, unit)` and `KIT.drop()` now know the song. Read the `residual_ms` that `beatgrid` prints: under 10 ms means the grid is steady enough to snap to; over 30 ms means a live or drifting track, so time each line from its onset instead (below).

Keep `project.json` `lines` to one short spoken title line (or one spoken sentence at the start), because the voiceover step needs at least that much; the lyrics do not go there.

## 2. Time each lyric line

Put the lyric list in `film.js`, each with the bar it starts on:

```js
const LYRICS = [
  { bar: 0, text: 'Wake up in the glow' },
  { bar: 1, text: 'Everything starts to move' },
  { bar: 2, text: 'Hold the light a little longer' },
  { bar: 3, text: 'We are just getting started' },
];
const BAR = KIT.beat(4) - KIT.beat(0);                       // a bar is four beats, in seconds
const start = (l) => KIT.beat(0) + l.bar * BAR;
```

For a steady track the bars are exact. For a live track, find where the vocal really starts with `./video.sh audio-report <track> --place-at <rough time>`: it prints the nearest onset to that time, and `--range A B` lists every onset in a stretch. Use that time instead of `start(l)`.

## 3. One line per bar

```js
const { el, seg } = KIT;
const rows = LYRICS.map((l) => el('div', 'lyric', KIT.stage, l.text));
function render(t) {
  LYRICS.forEach((l, i) => {
    const a = start(l), b = a + BAR - KIT.dur(0.1);
    const p = KIT.ease(seg(t, a, a + KIT.dur(0.35))), out = KIT.ease(seg(t, b - KIT.dur(0.25), b));
    rows[i].style.opacity = p * (1 - out);
    rows[i].style.transform = `translateY(${(1 - p) * 0.3}em)`;
  });
}
```

- Style `.lyric` big (84 px at 1080 or more, PLAYBOOK text rules), centred in the safe box. Fit long lines with `KIT.fit` (tools/fit.js): `KIT.fit.apply(row, { maxWidth: KIT.safe.w, maxHeight: KIT.safe.h })`.
- The chorus (after `KIT.drop()`) gets a bigger look: a second colour, or a `KIT.shot.pushIn` to the drop time.

## Checks

- `./video.sh stills lyrics`: every line fits in two lines at the safe-box width.
- `./video.sh qa lyrics`: a line change that is not on a beat shows up as a frame-jump WARN.

[Back to the index](README.md)
