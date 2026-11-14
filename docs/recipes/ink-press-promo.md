# Ink Press: a 36 s promo template

A complete, music-only promo of ten shots on the energy arc, as a working project: `projects/promo-ink-press/`. It is a template: replace the
copy, the logo letter and the screenshots; keep the arc.

```
reelwright promo my-launch "My Launch"      # copies the template to projects/my-launch
# edit projects/my-launch/hf/content.js     # copy, logo letter, screenshots (screen: 'assets/dash.png')
reelwright arc my-launch                    # the energy arc is valid
reelwright all my-launch                    # sched, music, film, qa, mp4
```

| # | Shot | Role | Energy | Bars | Move |
|---|---|---|---|---|---|
| 1 | open: one quiet line | open | 1 | 2 | `pushIn` 1.00 to 1.06 |
| 2 | hero: the product, once | hero | 3 | 2 | `pushIn`, card springs in |
| 3 | feature 1 | feature | 3 | 2 | `orbit` -9 to +9 degrees |
| 4 | breath card | breath | 1 | 1 | `pushIn` 1.00 to 1.03 |
| 5 | feature 2 | feature | 4 | 2 | `craneRise` |
| 6 | breath card | breath | 1 | 1 | `pushIn` 1.00 to 1.03 |
| 7 | feature 3 | feature | 5 | 2 | `pushIn` |
| 8 | the number (illustrative) | feature | 6 | 2 | `crashZoom` on the number, `impact` cue |
| 9 | group photo outro | peak | 9 | 3 | `pullBack`, a staggered spring of faces, `riser` + `subdrop` + one shake |
| 10 | end card: the wordmark holds | end | 3 | 1 | held still for 1 s+, `chime` |

How it follows the rules:

- **Every start is a bar** (`KIT.bar(k)` at 120 BPM: 18 bars = 36 s), so every cut lands on the beat; nothing is a literal second.
- **One move per shot**, each still after it. Two whole-frame hits in the film (the crash zoom and the peak shake), under the budget of three.
- **The close is the loudest**: energy 9 against 6 for the next, and the only `riser` and `subdrop`.
- **Holds first**: 1 s on the open, the hero and both breath cards, and 1.6 s on the wordmark, over a tenth of the film.
- **The camera is sharp**: `KIT.shoot(cam, state, { sharp: true })` ([shotcraft-lints](../playbook/shotcraft-lints.md)); under shuffled seeks the frames are identical.
- The number carries an "Illustrative data" label. No screenshots ship with the template: a mock UI card stands in until you set `screen`.

`node tools/selfcheck/p10-template.mjs` builds a fresh copy offline, checks that `project.json`'s arc and `content.js` agree and are valid,
seeks it in shuffled order and runs the aesthetic lints on it.
