# Motion rules (Phase 11, package P6)

The craft rules for how things move, as tables you can call (`KIT.motionRules`, `tools/motion-rules.js`, load it after
`engine.js`) and two checks that warn when a film breaks them. Rewritten from the video-shotcraft motion-design notes; numbers
the notes give are used as written, the rest are our own fit and are marked *fit*. Everything is a pure function of its
arguments: it is safe inside `render(t)`. Proof: `node tools/selfcheck/p6-rules.mjs`, `p6-motion-rules.mjs`.

```js
const R = KIT.motionRules;                       // also KIT.material, KIT.springs, KIT.distDur, KIT.loop when free
const m = R.material('elastic');                 // { durScale: 0.8, overshoot: 0.2, ease }
const p = m.ease(KIT.seg(t, a, a + 0.4 * m.durScale));
```

## 1. Before animating (3.1)

Eight steps, in `R.checklist`: purpose, hierarchy, personality, path, timing, layers, sound and beat, check. Three pillars
(`R.pillars`): **purpose** (every move has a job), **physics** (weight and ease are believable), **polish** (details are
finished). Three motion layers (`R.layers`): **primary** (the hero move that carries the point), **secondary** (support at
20-30 % of the primary's travel, delayed, counter-motion) and **ambient** (slow continuous life under everything).
Pick the theme archetype first (PLAYBOOK, Motion rules): it sets `KIT.ease`, tempo, stagger and settle for the whole film.

## 2. Easing (3.3) and material (3.4)

`R.easing(name)` is a cubic-bezier of `R.easings`:

| name | bezier | use |
|---|---|---|
| `standard` | .2, 0, 0, 1 | MD3 standard: most moves |
| `emphasized` | .05, .7, .1, 1 | MD3 emphasized (enter; = `KIT.E.emphasized`) |
| `emphasizedAccel` | .3, 0, .8, .15 | MD3 emphasized accelerate (exits) |
| `decelerate` | 0, 0, 0, 1 | MD3 standard decelerate (enters) |
| `accelerate` | .3, 0, 1, 1 | MD3 standard accelerate (exits) |
| `apple` | .25, .1, .25, 1 | Apple HIG default |
| `gentleFloat` | .37, 0, .63, 1 | slow in and out, ambient moves |
| `bounce` | .34, 1.56, .64, 1 | playful landing |
| `elasticSnap` | .68, -.55, .265, 1.55 | wind-up and snap |

`R.material(name)` returns `{ durScale, overshoot, ease }`; multiply your base duration by `durScale`. The overshoot is the
measured peak above the target (a back-out solved to that peak):

| material | durScale | overshoot |
|---|---|---|
| `rigid` | 1.2 | 0 % |
| `elastic` | 0.8 | 20 % (15-25) |
| `fluid` | 1.5 | 5 % |
| `paper` | 1.0 | 4 % (3-5) |
| `gas` | 2.0 | 0 % |
| `glass` | 0.9 | 0 % |

## 3. Springs (3.5)

`R.springs` is the palette (mass 1) to pass to `KIT.spring({ ...R.springs.bouncy })`; `R.spring(name)` adds `zeta`,
`overshoot` and `settle` (about 2 %, seconds).

| name | stiffness / damping | feel |
|---|---|---|
| `veryStiff` | 400 / 28 | snaps, no wobble (400+, 25-30) |
| `stiff` | 300 / 24 | UI toggles |
| `standard` | 200 / 18 | default |
| `bouncy` | 150 / 12 | playful (about 17 % overshoot) |
| `veryBouncy` | 120 / 7 | toy-like (100-200, 5-10) |

## 4. Duration and distance (3.6)

`R.durations` (seconds to enter, *fit*): micro .15 (press, toggle), chip .2, icon .25, card .3, panel .4, scene .5, hero .6,
ambient 1.2. Distance scales it: `R.distScale(px)` is 0.8 at 50 px, 1.0 at 100, 1.2 at 200, 1.4 at 400, 1.7 at 800, 1.9 at a
full screen and 2 beyond (*fit* through the notes' anchors); `R.distDur(px, base = 0.3)` multiplies. An exit is 65-75 % of its
entrance: `R.exitDur(enterSeconds, 0.7)`. Multiply by `KIT.dur(...)` as usual so the theme tempo still applies.

## 5. Stagger (3.7)

`R.stagger(cls, n, { from, grid, total, step })` returns n start offsets (seconds). Classes: `list` (step .05, from the top),
`grid` (.04, by distance from a corner; pass `grid: [cols]`), `nav` (.04), `dashboard` (.06, from the centre: hero first).
`from` is `start`, `center`, `edges`, `end` or an index. The total is capped under 0.5 s whatever n is, so a long list
speeds up instead of crawling. Overlap with the previous item is `R.overlap(cls, dur)` = 1 - step / dur.
`motion-rules` (below) warns when a film exceeds the budget.

## 6. Choreography (3.8)

Lead with the hero: it moves first, the rest follow. Keep one spatial origin per group (items come from the same edge or
point). Counter-motion: the supporting layer moves the other way by 20-30 % of the primary's travel (`R.counterMotion(dx)`).
No move across more than a third of the screen without a camera move or an intermediate key. No more than a third of a group
starts at once. `tools/checks/motion-rules.page.mjs` (WARN, `"qa": {"motion-rules": false}` to skip) samples `render(t)` and
reports:

- `linear`: an element travels at least 0.1 screen heights over 0.4 s or more at one constant speed (ease it);
- `stagger`: three or more same-size siblings start one after another over more than 0.5 s;
- `together`: more than a third of three or more same-size siblings start in the same frame.

Counter-motion and hero-first need judgement: they are rules for you, not lints.

## 7. Disney principles, emotion and story (3.9)

The twelve principles, as they apply to a film (the film-relevant lines):

1. **Squash and stretch**: a landing squashes a few percent, a fast move stretches along its path (`KIT.indicate`, scale).
2. **Anticipation**: a small move the other way before the main one (`elasticSnap`, or a 5 % wind-up key).
3. **Staging**: one thing reads at a time; dim the rest to 0.25.
4. **Straight-ahead and pose to pose**: author keys with `KIT.keys`, let eases do the in-betweens.
5. **Follow-through and overlapping action**: secondary parts settle later than the primary (stagger, `KIT.settle`).
6. **Slow in and slow out**: never linear on a spatial move (the `linear` lint).
7. **Arcs**: natural paths curve; use `KIT.path` or an arc, not a straight line, for emotional moves.
8. **Secondary action**: ambient life under the hero (`KIT.loop`, section 10).
9. **Timing**: duration carries weight (section 4, materials).
10. **Exaggeration**: push overshoot and scale further than feels right, then back off a third.
11. **Solid drawing**: consistent perspective and depth across a scene (`KIT.shot.planes`).
12. **Appeal**: one clear shape and one clear motion per idea.

Emotion to motion, `R.emotion[name]` = `{ ease, durScale, path, spring }` (*fit*): `joy` elasticSnap, 0.8x, arc up, bouncy;
`calm` gentleFloat, 1.5x, straight and slow, standard; `trust` standard, 1.0x, straight and level, stiff; `urgency` accelerate,
0.6x, straight diagonal, veryStiff; `surprise` bounce, 0.7x, arc with overshoot, veryBouncy; `sadness` decelerate, 1.8x, sinks
and arcs down, standard; `power` emphasized, 1.2x, straight from below with a slow start, stiff. **The path is the emotion**:
an arc up reads as hope, a straight diagonal as intent, a drop that settles as weight.

Narrative in four acts (`R.acts`, share of the film): **hook** 10 %, **build** 35 %, **payoff** 40 %, **close** 15 %. Energy
rises through the build, peaks in the payoff, and the close breathes (an ambient hold, the logo).

## 8. Entrances and exits (3.10)

| family | enters | exit | calls |
|---|---|---|---|
| `direct` | the element slides or fades itself | dissolve | `KIT.keys`, `KIT.easing`, `KIT.stagger`, `KIT.win` |
| `emergent` | grows out of its parent or a point | collapse | `KIT.spring`, `KIT.transition.names` (`iris`, `zoom`), `KIT.keys` |
| `reveal` | a mask uncovers it | dissolve | `KIT.transition.names` (`wipe`, `clockWipe`, `barnDoor`), `KIT.path` |
| `assembled` | parts fly in and snap together | transfer | `KIT.stagger`, `KIT.spring`, `KIT.path`, `KIT.shot` |

Continuity: an exit hands the eye to the next entrance. Leave toward where the next thing arrives from and keep one element
on screen across a cut (`R.continuity`).

## 9. Feedback and state (3.12)

UI states are mostly shown inside recordings; when you build them, `R.feedback` has the numbers: `press` scale .96 over .1 s
(accelerate), `hover` 1.03 over .2 s, `toggle` .2 s standard, `success` the bouncy spring over .4 s (then `success-check`
block), `errorShake` amplitude 8 px, 3 cycles in .4 s (`R.shake(t, t0)` is a pure damped sine; or `KIT.indicate.wiggle`),
`validation` a .2 s decelerate colour change (`KIT.indicate.flash`). Blocks: `press-ripple`, `settings-toggle-flow`,
`success-check`, `input-feedback`, `toggle-flip` (`reelwright add`).

## 10. Ambient loops (3.11)

`R.loop(t, period, shape = 'sine', id)` (also `KIT.loop`) returns 0..1; shapes `sine`, `saw`, `tri`, `breathe`. With an `id`
the phase is seeded, so ten icons do not breathe in step. `R.ambient`: `breathe` (scale 1 to 1.03 over 4 s), `float` (px, three
layered periods 3.1 / 4.7 / 7.3 s), `gradient` (degrees, 12 s), `rotate` (deg/s), `shimmer` (sweep 2.4 s), `parallax` (px,
farther layers slower). Particle ambient: 12-40 particles at 0.01-0.05 screen heights per second, seeded with `KIT.doodle.rng`,
never `Math.random`. Existing blocks: `aurora-drift`, `grain-field`, `drift-hold`, `shimmer-sweep`, `beat-pulse-background`.

## 11. Quality checklist, severities and troubleshooting (3.14)

`R.quality` is this table; every `enforced` name is a real check (`p6-motion-rules.mjs` verifies it).

| tier | check | enforced by |
|---|---|---|
| blocker | frames are a pure function of t | `seekable` |
| blocker | at most 3 flashes in 1 s | `flash` |
| blocker | captions in the safe area, contrast 4.5 | `captions` |
| blocker | numbers carry an Illustrative data label | `illustrative` |
| blocker | no `wiggle` / `random` in a Lottie expression | `lottie-expressions` |
| major | spatial moves are eased | `motion-rules` |
| major | stagger under 0.5 s, at most a third start at once | `motion-rules` |
| major | no hard starts or stops at speed, no teleports | `taste` |
| major | text does not overlap, is not tiny | `overlap`, `tiny-text` |
| minor | nothing sits still for over 4 s | `taste` |
| minor | no stretch of dark frames | `dark` |

A blocker fails the build, a major is a WARN you fix before showing, a minor is judgement.

| symptom | cause | fix |
|---|---|---|
| motion looks mechanical | linear, or one ease everywhere | `R.material`, a theme archetype, vary ease by role |
| it feels slow | duration ignores distance | `R.distDur`; exits at 70 % |
| it feels jittery | spring too light, or stagger over 0.5 s | `R.spring('stiff')`; smaller stagger total |
| everything moves at once | no hierarchy | lead with the hero, stagger the rest, hold the ambient layer |
| frames differ between runs | a clock or `Math.random` in `render(t)` | the `seekable` gate names the line |
