# Sound depth (Phase 10g)

Every sound is synthesised with numpy: no samples and no Mixkit, so it is royalty-free by construction. Self-check:
`node tools/selfcheck/sound.mjs`. Existing films are byte-identical: the 9 old kinds and the chill/drive beds did not
change.

## SFX kinds (`KIT.cue(t, kind)`, mixed by `tools/mix.py`)
| Kind | Use |
|---|---|
| click, tap, pop, toggle | UI presses, a switch flipping |
| tick, typing | a key, a burst of typing |
| shutter | a screenshot or capture |
| notification, chime, sparkle, bubble | something arrives, success, a shine, a playful pop |
| paper, scratch | a page slide, a pen on paper (doodle films) |
| swish, whoosh, whooshsoft, whooshfast, whooshdeep, whooshdown | movement: light → heavy, falling |
| riser, impact, thud, subdrop, glitch | build-up, hit, soft landing, bass drop, digital break |

- Each kind has a **peak time** (PEAK table in mix.py). The mix starts the sound early, so its peak lands on the cue
  (a whoosh 0.3 s early, a riser 1.45 s early).
- **Repeats:** new kinds cued again within 0.5 s alternate pitch (0, +1, −1 semitone) and step down ×0.8 each, so a
  burst sounds played rather than copied.
- **Ducking:** the music dips −6 dB (30 ms down, 300 ms up) under each `subdrop`. To duck under `impact` and `riser`
  too, set `"music": { "duck_sfx": true }`. It is off by default so older films keep their mix.
- **One big phrase per film:** mix.py prints a WARN when a film has more than one riser or more than one subdrop. The
  classic close is riser → impact → sparkle.

## Beds (`"music": { "style": … }`, built by `tools/music.py`)
| Style | Default BPM | Feel |
|---|---|---|
| chill | 100 | pad, pluck arpeggio, soft kick (default) |
| drive | 100 | four-on-the-floor, supersaw stabs, filtered intro, drop |
| house | 124 | four-on-the-floor, offbeat open hats, clap on 2 and 4, sidechain pump, chord stabs |
| hiphop | 90 | boom-bap kick and snare, ~58 % swung 16th hats, sub bass, mellow keys, faint vinyl hiss |

drive, house and hiphop honour `drop_bar` (filtered intro, then the drop) and `end_bar` (a final chord plus a boom
that rings out). `music.bpm` overrides the default tempo. To use a real track, put it at `music.file`. These two beds
replace the five Mixkit tracks video-shotcraft ships; never copy those files.

## Land on the hit, not the beat (`KIT.hit`)

A beat grid says where the bar is; an onset says where the hit is. `KIT.hit(t, { band = 'kick', tol = 1/60 })` moves a
moment to the nearest onset of that band when one is within `tol` seconds, else it returns `t`. The onsets are measured on
the **rendered film's own audio** by `tools/beatsync.py --write` (the same kick / snare / hat detector `qa`'s cut-on-beat
check uses) → `music/onsets.json`, and `sched` bakes them into `window.MUSIC.onsets = { kick, snare, hat }` in film time.
Run `reelwright beatsync --write` once after a render; the audio does not change between renders, so the next one can land
on those hits. With no onsets (a music-less film, or none written yet) `KIT.hit` is a no-op, so nothing breaks.

±1 frame at 60 fps (16.7 ms) is inside every published audio/video sync window (ITU-R BT.1359-1: 45 ms lead, 125 ms lag),
so a snapped landing is invisible and reads as on the hit. `tol` defaults to exactly that frame. The list is baked at build
and read at render: never drive motion from an `AnalyserNode`/FFT, which depends on the frame rate.

```js
const hit = (t) => KIT.hit(t, { band: 'snare' });     // a cut, a flash, a logo lockup lands on the snare
```

Load `tools/hit-sync.js` after `engine.js` (it adds `KIT.hit`; a film that does not load it is unchanged).

## Named markers (`KIT.mark` / `KIT.until` / `KIT.dur`)

A cue that means "when the CTA is spoken" should not be a number that drifts when the script changes. Name it in
`project.json`:

```json
"marks": { "cta": "cta", "price": { "line": "demo", "word": "forty", "nth": 1 } }
```

A string is a VO line id (the marker starts at the line); an object names a word in it (the marker starts on that word, the
same match `KIT.W` does, and follows the base-language fraction in `--lang` builds). `reelwright marks <project>` resolves
them against the transcript into `marks.json` beside the film (`{ name: { line, [word, nth], t, dur } }`, `dur` to the end
of its line), and `sched` bakes `MUSIC.marks` and calls the same resolver, so `all`/`film` keep it current. In the film
(load `tools/hit-sync.js` after `engine.js`):

```js
KIT.mark('cta')            // the absolute time
KIT.until('cta', t)        // marks.cta.t - t: positive before it, negative after (hold a card, fade a caption)
KIT.dur('cta')             // how long the marker's line runs
```

A missing name throws (`no mark "cta": …`) instead of rendering a silent zero, like `KIT.W`. This is Motion Canvas's
`waitUntil`/`useDuration` marker model only: no generator executor, so a frame's cost does not grow with `t`.
