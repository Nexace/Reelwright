# Final review: an itemised checklist and a clean-context reviewer

The last step before you report an mp4 (AGENTS.md step 5). The person who built the film has seen it too many times: they read the
frames they meant, not the frames that are there. So the final review is done by a **reviewer with a clean context**: a fresh
subagent (or a fresh session) that gets the brief, the stills and the qa output, and nothing about how the film was made. It
ticks every item below and returns PASS or FAIL per id with the time or file. The builder fixes every FAIL and re-runs it.

`reelwright review <project>` prints the brief for that reviewer: the project's facts, the commands to run, and this checklist.
Paste it into the reviewer's prompt as is.

## How to run it

1. Finish the build: `reelwright all <project>` (it ends with `qa`; every FAIL gate is already fixed).
2. For the lints that are off by default, switch them on in `project.json` for this one run:
   `"qa": {"aesthetic-rules": true, "sfx-repeat": true, "cut-on-beat": true, "verify-av": true}` (see [shotcraft-lints.md](shotcraft-lints.md)).
3. Start the reviewer with the brief from `reelwright review <project>`. Give it read access to `projects/<name>/stills/`,
   `out/*.mp4` and the qa output. Do not give it `film.js`, the script's intent or your notes: it judges the film, not the plan.
4. The reviewer answers one line per item: `P1 PASS`, `V4 FAIL 12.4 s: the card is clipped at the right edge`. It must open
   the frames around every time `qa` flagged and say what it saw.
5. Fix, rebuild the part that changed (`audio` / `film`), review again until no FAIL. Then report the mp4 path.

## Checklist

Severity: **F** fails the review, **W** is a judgement call the reviewer explains either way.

### P: plan and pacing

| Id | Sev | Check | How |
|---|---|---|---|
| P1 | F | The first second shows the point (a hook), not a logo or a loading state | stills at 0.0 / 0.5 / 1.0 s |
| P2 | F | One idea per scene; each scene has one thing the eye goes to | `stills/sheet.jpg`, one scene per row |
| P3 | W | The energy arc holds: low open, one hero, features that climb with breaths between, the close the loudest | `reelwright arc <project> --mix` |
| P4 | F | The film is the length asked for (to the second) and ends on its last beat, not mid-fade | `out/*.mp4` duration |
| P5 | W | No stretch over 4 s where nothing moves, fades or changes (taste `pacing`) | qa WARN list |

### F: frame and text

| Id | Sev | Check | How |
|---|---|---|---|
| F1 | F | Nothing outside the title-safe box that should not be: no clipped text, no card cut by the edge | stills at every scene's midpoint, all formats rendered |
| F2 | F | Every text is readable at phone size: captions at least 5% of the frame height, other text at least 3% (Q11) | qa `aesthetic-rules` |
| F3 | F | Captions: at most 2 lines, inside the safe area, contrast 4.5:1 | qa `captions` gate |
| F4 | F | Invented numbers carry "Illustrative data"; real numbers carry a source; AI media carries its label | qa `illustrative`, `ai-label` |
| F5 | W | The wordmark is on screen, still and opaque for at least 1 s (R1) | qa `aesthetic-rules` |
| F6 | W | The brand is consistent: one accent, the theme's fonts, no stray default fonts | stills |

### V: visuals and motion

| Id | Sev | Check | How |
|---|---|---|---|
| V1 | F | No blank, black or half-loaded frame; no flash over 3 per second | qa `dark`, `flash` |
| V2 | F | Every move ends still: a push-in does not drift on, a card does not jitter after it lands | frames 0.3 s after each move |
| V3 | W | At most 3 whole-frame beat hits (shake, crash zoom) in the film (R4) | qa `aesthetic-rules` |
| V4 | F | No hand-held drift on a product shot (Q3); text on a tilted or zoomed card is sharp (`sharp: true`) | qa `aesthetic-rules`; frames at the deepest zoom |
| V5 | F | Cuts land on the beat: within 3 frames of the grid | `reelwright beatsync <project>` |
| V6 | W | Overlap, tiny-text and wordy warnings are each fixed or explained | qa WARN list |

### A: audio

| Id | Sev | Check | How |
|---|---|---|---|
| A1 | F | Loudness within 1 LU of the target, true peak at most -1 dBTP | qa `loudness` gate |
| A2 | F | The voice is clear over the music in every line; no clipping, no pop at the ends | listen, or the ducking in `mix.wav` |
| A3 | F | A repeated effect alternates pitch and steps down (S2); at most one riser and one subdrop | qa `sfx-repeat`, mix WARN |
| A4 | F | The audio in the mp4 sits on the picture: offset under 1 frame, no cue more than a frame late | `reelwright verify-av <project>` |
| A5 | W | The music starts on a bar, and the drop lands on the reveal | `music/grid.json`, the time of the reveal |

### D: delivery

| Id | Sev | Check | How |
|---|---|---|---|
| D1 | F | The mp4 plays: opens, right size and fps, has audio | `ffprobe` |
| D2 | F | Every format asked for exists and was reviewed, not only 16x9 | `out/*-9x16.mp4` and so on |
| D3 | F | Nothing in the project made a real write (publish, pay, send) while recording | the recording script |
| D4 | W | `reelwright clean <project>` has been run, and the report names the mp4 path | the report |

## The reviewer's reply

```
P1 PASS
P2 FAIL 14.2 s: scene shows a chart and a quote at once
...
VERDICT: FAIL (2 F items)
```

A reviewer that returns PASS on every line without opening a frame has not done the review: ask for the time and a one-line
observation on at least one item per section.
