# Faceless explainer

A 60 to 90 second explainer led by a voiceover, with motion graphics and no recorded app and no on-screen presenter: a claim, a diagram or chart, a result, a call to action.

## When to use

- An idea, not a product tour: why something works, how a process flows, what the numbers say.
- When nothing needs recording: it is a HyperFrames film (`--renderer hyperframes`).

## 1. Script first

```bash
./video.sh new explainer --renderer hyperframes
```

Ask the audience and length (AGENTS.md), then write 6 to 9 lines of one sentence each into `project.json`, show them to the user, and only then build. One idea per line; the line that names a number or a thing is the line its visual lands on.

```json
"lines": [
  { "id": "hook",    "gap": 0.0, "text": "Most invoices are paid late." },
  { "id": "why",     "gap": 0.7, "text": "Because nobody owns the follow-up." },
  { "id": "how",     "gap": 0.7, "text": "A reminder on day one changes that." },
  { "id": "result",  "gap": 0.7, "text": "Late payments drop by a third." },
  { "id": "close",   "gap": 0.8, "text": "Send the first reminder today." }
]
```

## 2. A visual per line

| Line | Visual | Tool |
|---|---|---|
| hook | the claim as big type | `KIT.layout.kinetic` |
| why | a flow of three boxes with arrows, drawn on | `KIT.math` or `KIT.doodle` (theme `doodle`) |
| how | the one step highlighted, the others dimmed | the focus rule (PLAYBOOK) |
| result | a stat with count-up | `KIT.layout.stat` with `note: 'Illustrative data'` unless the number is real |
| close | wordmark and one action | `docs/recipes/end-card.md` |

Start from the recipes in this folder rather than from a blank file, and the shared setup in the [README](README.md#shared-setup). Pick a theme with `./video.sh themes`, or `theme-brief` from a one-line description.

## 3. Pace

- Each scene starts on the beat before its line (the shared setup does this) and crossfades into the next, so no frame is empty.
- Leave one breath per 3 scenes: a held frame of 0.8 to 1.2 s with one thing moving.
- The VO is online (edge-tts): `./video.sh audio explainer` needs internet; stills need its timings.

## Checks

- `./video.sh stills explainer`, read `stills/sheet.jpg`; then `node tools/checks/taste.page.mjs projects/explainer`.
- `./video.sh all explainer` ends with `qa`: a made-up number without a label fails the `illustrative` gate.

[Back to the index](README.md)
