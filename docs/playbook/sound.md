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
