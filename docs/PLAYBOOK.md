# Playbook — what makes these films work

Lessons from a dozen product films (launch films, creator pitches, manager walkthroughs, explainers).
Read once before your first real film.

## Story before pixels

- **Sell a story, not a feature list.** The film that worked: hook (the pain, in the viewer's words) →
  the grind (show how bad the old way is — a stopwatch, a repeated chore) → reveal → 3–6 features on real
  footage → payoff (before vs after, in numbers) → end card. A montage of features "looked bad and didn't sell".
- **Know the audience before writing a line.** Same product, different films:
  - *Users / launch*: emotion + benefit, fast, music-led, 30–90 s.
  - *Partners* (another company's team): trust and clarity — show permissions, what is and isn't done
    on their behalf. Calm, simple, no hype.
  - *Manager / founder in a meeting room*: **slow**. Each step visibly finishes before the next starts.
    Show the real thing (real data, real files, real flow), don't describe it. Two earlier cuts were
    rejected as "too fast" before a 0.7 s gap between lines and a −3% voice rate landed.
- **Write the VO first**, read it aloud, then build the picture to it. Short sentences. One idea per line.
- **Length**: 30 s (promo), 60–90 s (product demo), 2–5 min (explainer). If it's longer, it needs chapters.

## Truthfulness

- Numbers on screen that aren't real get a small **"Illustrative data"** label — unless the stakeholder
  explicitly decides otherwise for a dramatized film.
- Don't claim what the product doesn't do. Check claims against the code/product before the VO is recorded
  (e.g. a limit is 20, not 24; a feature is live, not "coming soon").
- Use fictional people, phone numbers and IDs (`+1 415 555 01xx`, "Maya Brooks") — never a real user's or
  a real test account's ID on screen.
- **Never let a recording really publish, pay, post or message.** Mock write calls (Playwright
  `page.route('**/api/**', …)` answering non-GET requests with a fake success) or use a demo build.

## Picture

- **Isolate the UI.** The best-looking shots put the app (or one panel of it) on a clean background, window
  chrome hidden. A full browser page with a dim overlay leaves half-words and white edges.
- **Phone apps go in a phone frame on a plain stage**; captions on the other side. Desktop: a browser frame.
- **Camera moves are slow and purposeful**: punch in on the thing being talked about, hold, pull back.
  No swooping. If you zoom into a full-width element (an input bar), it gets cropped — scale the whole
  device instead.
- **Every visual change happens on a word or a beat.** Use `W('line', 'word')` and `KIT.snap()`; never
  hand-typed seconds.
- Captions: few words, big. Subtitles (karaoke highlight) help when the audience may watch muted.
- Wait for images to load before a recorded tap, or the layout shifts and the tap lands on the wrong thing.

## Sound

- **Voice**: edge-tts Andrew (warm, US male) or Ava (bright, US female) at +4–8% rate for promos, −3 to
  −8% for explainers. Hindi: `hi-IN-SwaraNeural` at −6%, and spell English UI words in Devanagari for
  correct pronunciation, keeping the on-screen captions in English.
- **Music** sets the energy. Find free tracks on Mixkit (licence: free use, no attribution). Always measure
  the beat grid (`beatgrid`) — listed BPMs are often wrong, and a 0.5% error drifts a beat in two minutes.
- Start the music so the **drop lands on the reveal**, and let the song's final hit (or silence) land on
  the end card. `beatgrid` finds the drop; cut to `KIT.drop()` (or set `music.drop_bar` by hand).
- **Other languages**: add `"langs": { "es": { "voice": "es-ES-AlvaroNeural", "lines": { "<id>": "…" } } }` to
  `project.json` and build with `--lang es` → `out/<name>-es.mp4`. Voice, captions and `.srt/.vtt` follow; cues
  on English words (`W('chart', 'grows')`) land at the same point of the translated line. Copy you typed into
  film.js stays as typed. Get translations from a fluent speaker; nothing is machine-translated.
- If you cut music to shorten it, cut on bar lines between sections that sound alike, with a short
  crossfade — otherwise the jump is audible.
- Music ducks ~10 dB under the voice (automatic). Final loudness −14 LUFS (automatic).
- SFX: quiet. A tap click per tap, a whoosh per transition, one impact for the logo, one chime for the
  payoff. More than that gets tiring.

## Process

- **Ship a v1 fast, then iterate.** Render stills (`./video.sh stills`) and a contact sheet before a full
  render; it's seconds instead of minutes.
- **Watch it yourself before sending.** `./video.sh qa` lists blank frames and frame-to-frame jumps; every
  big jump should be on a cut. Then scrub the mp4 at the times it prints.
- `qa` also runs gates that fail the build: **loudness** (±1 LU of `loudness`, peak ≤ −1 dBTP), **captions**
  (inside the safe area, ≤ 2 lines, contrast ≥ 4.5), **flash** (≤ 3 flashes a second, for photosensitive
  viewers), **illustrative** (numbers like 40% or $12 need the label on screen), **seekable** (no clock,
  randomness, timers or CSS transitions in the film's code). Fix the film; turn a gate off only for a reason,
  e.g. `"qa": { "illustrative": false }` when the numbers are real. `projects/qa-broken` trips every gate.
  Screenshots count too: give an `<img>` of a page `data-qa-text="<the text it shows>"` and the gate reads its
  numbers; real figures from a real site pass with a visible "Source: …" credit instead of the label
  (`from-url` films do both). Version numbers (v8.3.4, 3.10.2) aren't data.
- `encode` writes `<out>.srt` and `<out>.vtt` beside the mp4 for players and upload sites.
- Re-recorded the take? Re-run `sched` and `info` — anchors and SFX times derive from the take's marks;
  stale ones give blank white frames.
- Keep only the final mp4. Frames are ~1 GB per minute: `./video.sh clean <project>`.
- Make re-cuts in a copy (`./video.sh new v2` and copy files over) so the approved version stays reproducible.

## Engine rules (when writing film.js)

- `render(t)` sets every style from `t` alone. No CSS transitions/animations, no `requestAnimationFrame`,
  no state carried between frames — frames render out of order across parallel pages.
- Build all elements once at load; in `render(t)` only change `opacity`, `transform`, `src`, text.
- Use `KIT.show(el, opacity)` (also sets visibility) and `KIT.img(img, src)` (waits for decode).
- An element with a `z-index` inside a flex container can paint over overlays — give overlays their own
  higher `z-index`.
- Fonts: system fonts render offline. For a brand font, put the `.woff2` in the project and use `@font-face`
  — the renderer waits for fonts before the first frame.

## Scene layouts (`KIT.layout.*`, tools/layouts.js)

Ready-made scenes for title cards and feature beats, so a film doesn't hand-place text. Each one is
`KIT.layout.<name>({ ...content, in, out, note })` → `{ el, set(t) }`: it builds itself inside the title-safe box,
re-arranges for 16x9 / 9x16 / 1x1, styles itself from the theme's tokens, enters after `in` and leaves before `out`
with the theme's motion. You compute `in`/`out` from `V()`/`W()`/`KIT.snap()` and call `set(t)` in `render(t)`.
`note: 'Illustrative data'` puts the label under the box.

| Layout | Use it for |
|---|---|
| `kinetic({ line, accent })` | The hook or a slogan: the VO line itself, huge, each word landing as it's spoken. |
| `fullBleed({ text, accent })` | One short claim that should fill the frame (no VO sync — words rise in turn). |
| `split({ kicker, title, body, media, flip })` | A feature with its picture: text beside a media card (stacked in vertical/square). Fill `.media` with a mock UI, an image, a clip. |
| `tiltedDevice({ kicker, title, body, screen, aspect })` | Revealing the product: a framed screen tilted in 3D that settles flat, caption beside/below. |
| `bento({ kicker, title, tiles: [{ icon, title, body, wide, hero }], step })` | "Everything it does" — a grid of tiles popping in on the beat (4 columns wide, 2 vertical). |
| `stat({ value, prefix, suffix, decimals, label, at })` | One number that matters, counting up from `at` (put it on the spoken number). |
| `quote({ text, author, role })` | Social proof. Fictional people unless it's a real, approved quote. |

```js
const L = KIT.layout, IN = (id) => KIT.snap(KIT.V(id).start - 0.45);   // on the beat just before the line
const stat = L.stat({ in: IN('stat'), out: IN('quote') + KIT.dur(0.45), value: 40, suffix: '%', label: 'faster to ship',
                      at: KIT.snap(KIT.W('stat', 'forty')), note: 'Illustrative data' });
function render(t) { stat.set(t); /* … */ }
```

One layout per VO line reads best. Let each scene's `out` fall just after the next one's `in`
(`+ KIT.dur(0.45)`): the exit takes the last 0.45 s before `out`, so the old scene fades as the new one enters; `out` = next `in` leaves a blank dip that
`qa` flags, while a short overlap reads as a crossfade. projects/layouts-hf is the worked example.
