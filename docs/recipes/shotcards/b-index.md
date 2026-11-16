# Shotcards B: typography, UI entrance, data, effects, interaction

Fifty-seven video-shotcraft cards as ready-made, seekable helpers: `KIT.shotcards.<name>(opts)` returns `{ el, end, set(t) }`. Each recipe shows the call, the timing and the usual mistakes.
Everything is a pure function of `t`: the DOM is built once when you call the helper, `set(t)` only writes styles from `t` (no clocks, no `Math.random`, no state kept between frames), so scrubbing,
shuffled seeks and any fps give the same frame. Call every helper's `set(t)` from `render(t)`. The numbers (timings, easings, sizes) are our tuning; the source cards' own numbers were not available offline.

## Loading the helpers

Five files, one per category. Each needs only `tools/engine.js`, and they share one `KIT.shotcards` object, so load any of them in any order.

| Category | File | Cards |
|---|---|--:|
| Typography | `tools/shotcards/typography.js` | 14 |
| UI entrance | `tools/shotcards/ui-entrance.js` | 17 |
| Data | `tools/shotcards/data.js` | 5 |
| Effects | `tools/shotcards/effects.js` | 14 |
| Interaction | `tools/shotcards/interaction.js` | 7 |

**HyperFrames** (`hf/index.html`): after `kit/engine.js`,

```html
<script src="kit/shotcards/typography.js"></script>
<script src="kit/shotcards/data.js"></script>
```

`copyKit` (`tools/kit_files.mjs`) copies `tools/*.js` only, so it must also copy `tools/shotcards/` to `kit/shotcards/`; that is a one-line edit to `kit_files.mjs` (the Phase 11 P3 report carries the patch). Until it is applied, copy the folder by hand.
**pvk** (`film/index.html`): `<script src="../../../tools/shotcards/typography.js"></script>` after `engine.js`.

```js
const { snap, W } = KIT;
const hud = KIT.shotcards.fuiHud({ at: snap(W('hook', 'scan')), lockAt: snap(W('hook', 'lock')) });
function render(t) { hud.set(t); }
```

Rules of the road: build after fonts and layout (helpers measure text and boxes once); pass `at`, `dur` and every time from `W()` / `snap()` / `KIT.beat()`, never raw seconds; colours are hex or `var(--kit-*)`;
images and fonts are local files (the `no-network` gate). Made-up numbers get an "Illustrative data" label.

`voiceWaveform` needs an audio envelope: `node tools/shotcards/envelope.mjs vo/line.mp3 --var ENV > film/env.js` (ffmpeg; prints a 30 fps RMS array).

## Verified

`node tools/selfcheck/shotcards-b.mjs` builds every helper (fixtures in `tools/selfcheck/shotcards-b/`), records the whole DOM it writes at 12 times forward, shuffled in the same page and shuffled in a fresh page, and
repeats this with the kit loaded the HyperFrames way (`kit/shotcards/`, the producer's own file server): all must match. It also fails on a frame that does not move, a non-finite number formatted into a style,
a page error or a network request, and runs `envelope.mjs` on a synthetic tone. It checks that each helper is pure and loads; it does not judge how a card looks (look at `reelwright stills`).

## Recipes

| Recipe | Parity row | Module | What it is |
|---|---|---|---|
| [Before / after slider scrub](before-after-slider-scrub.md) | `doodle-shots-motion:2.11` | `data.js` | Two layers and a persistent divider with a knob: it scrubs, and rests at the split so the film can sit on it. |
| [Live chart moves](chart-live-moves.md) | `doodle-shots-motion:2.12` | `data.js` | Three chart moves that read as live data: a scrolling oscilloscope trace, a dot swarm regrouping into counts, and an axis that rescales when an outlier lands. |
| [Gauge readouts: needle self-test and tape scroll](gauge-readout-moves.md) | `doodle-shots-motion:2.13` | `data.js` | An instrument dial whose needle self-tests (full scale, back to zero) before springing to the value, and a ruler tape that slides under a fixed pointer. |
| [Scroll brake (changelog, reticle lock)](scroll-brake-moves.md) | `doodle-shots-motion:2.14` | `data.js` | A list that scrolls at speed and brakes onto one row: the row you want the viewer to read lands under a lock-on reticle. |
| [Timeline travel](timeline-travel.md) | `doodle-shots-motion:2.15` | `data.js` | A camera travelling a long timeline: it flies to each event, zooms in to dwell on it, zooms out to move on. |
| [Assemble, then type fly-in](assemble-then-type-flyin.md) | `doodle-shots-motion:2.16` | `effects.js` | Skeleton blocks fly in from all sides and assemble into a panel; a headline then types in above it, each letter flying from depth. |
| [Aurora bloom background flip](aurora-bloom-bg-flip.md) | `doodle-shots-motion:2.17` | `effects.js` | A drifting aurora background; a white bloom peaks and the palette flips underneath it. |
| [FUI HUD: brackets, readouts, reticle](fui-hud-moves.md) | `doodle-shots-motion:2.19` | `effects.js` | Corner brackets that draw in, readouts that flicker, and a reticle that spins in from large and locks on. |
| [Glow orbs and fly-lines](glow-flyline-moves.md) | `doodle-shots-motion:2.20` | `effects.js` | Ambient breathing orbs, a glowing arc that a bright orb draws, and an orb that relays across nodes along arcs. |
| [Icon performance: attention bounce and morph](icon-performance-moves.md) | `doodle-shots-motion:2.21` | `effects.js` | An icon that hops with squash and stretch to get attention, and a glyph that morphs into another on a springy beat. |
| [Impact feedback: hit counter and anime impact](impact-feedback.md) | `doodle-shots-motion:2.22` | `effects.js` | A big count that pops, shakes and rings on every hit, and one anime-style impact: speed lines, flash, slammed word, shaken frame. |
| [Light play: spotlight and sheen sweeps](light-play-moves.md) | `doodle-shots-motion:2.23` | `effects.js` | A soft spotlight that moves across a darkened frame, and a diagonal band of light that crosses a card. |
| [Radial ripple, phone, chips](radial-ripple-phone-chips.md) | `doodle-shots-motion:2.24` | `effects.js` | A phone in the middle sends ripples out; chips fly out of it along rays and settle on a ring. |
| [Riso print hits](riso-print-hits.md) | `doodle-shots-motion:2.25` | `effects.js` | Ink layers in multiply blend that sit slightly off register and are thrown out of register on every hit, then settle. |
| [Scan bracket sweep](scan-bracket-sweep.md) | `doodle-shots-motion:2.26` | `effects.js` | Four corner brackets close onto a subject while a scan band sweeps down through it and back, a percent readout counting. |
| [Scanline, focus and callout](scanline-annotate-focus.md) | `doodle-shots-motion:2.27` | `effects.js` | A scanline passes over a subject, the rest dims, and a connector draws out to a labelled callout. |
| [Scanline assemble fly-in](scanline-assemble-flyin.md) | `doodle-shots-motion:2.28` | `effects.js` | A glowing scanline sweeps down the frame; each item flies in from the side as the line reaches its row. |
| [Slam entrances](slam-entrance-moves.md) | `doodle-shots-motion:2.29` | `effects.js` | A word that snaps flat out of extreme perspective, a score that slams in with a shockwave, and a reusable burst of shards. |
| [Spotlight moves: wake panel, slide pan, corner reveal](spotlight-sweep-moves.md) | `doodle-shots-motion:2.30` | `effects.js` | A panel that wakes and sleeps in a glow, a spotlight that pans across the columns of a slide, and content revealed by light growing from a corner. |
| [Canvas materialize: panel to canvas, diagram cascade](canvas-materialize-moves.md) | `doodle-shots-motion:2.32` | `interaction.js` | A card grows into the full canvas while a dot grid materialises; nodes then cascade outward along their edges. |
| [Collaborative cursors](collab-cursor-moves.md) | `doodle-shots-motion:2.34` | `interaction.js` | Labelled cursors of several people moving at once, each with a dotted trail and a click ring. |
| [Picker and feature carousel](picker-carousel-feature-cycle.md) | `doodle-shots-motion:2.37` | `interaction.js` | A row of option chips whose highlight moves every few seconds while a feature card cycles in step. |
| [Segmented thumb and hero](segmented-thumb-hero.md) | `doodle-shots-motion:2.38` | `interaction.js` | A segmented control whose thumb springs to a selection, driving a hero panel below it. |
| [Theme switch: sweep toggle and palette ripple](theme-switch-moves.md) | `doodle-shots-motion:2.39` | `interaction.js` | The same scene built twice, the second copy with other --kit-* colours, revealed by a diagonal wipe after a toggle flips, or by a circular ripple from a palette swatch. |
| [Type and filter](type-and-filter.md) | `doodle-shots-motion:2.40` | `interaction.js` | A search field types a query while the list filters per character: rows that stop matching collapse, matching letters light up. |
| [Voice waveform from the audio](voice-waveform-live.md) | `doodle-shots-motion:2.41` | `interaction.js` | Bars that follow the real loudness of a voiceover or music: an envelope is dumped once, the film reads it as a pure function of t. |
| [Countdown arc with scatter exit](countdown-arc-scatter.md) | `doodle-shots-motion:2.84` | `typography.js` | 3, 2, 1 inside a ring that drains each second; then a word pops and scatters in pieces. |
| [Flying words (word tunnel)](flying-words.md) | `doodle-shots-motion:2.86` | `typography.js` | Words travel along z towards the camera in perspective and pass it, one after another. |
| [Gradient word sweep](gradient-word-sweep.md) | `doodle-shots-motion:2.88` | `typography.js` | A bright gradient band crosses a sentence word by word, leaving each word in the final colour. |
| [Lead word zoom, then assemble](lead-word-zoom-assemble.md) | `doodle-shots-motion:2.89` | `typography.js` | The first word fills the frame, holds, then settles into the sentence while the rest assembles around it. |
| [Outline word, then fill](outline-word-fill.md) | `doodle-shots-motion:2.91` | `typography.js` | Live text drawn as an outline left to right, then washed with a solid fill. |
| [Chip rail with settled state](pill-chip-slot-cycle-handled.md) | `doodle-shots-motion:2.93` | `typography.js` | Several slot-machine chips roll through their words, one after another, and each settles into a "handled" state with a tick. |
| [Pill slot cycle](pill-slot-cycle.md) | `doodle-shots-motion:2.94` | `typography.js` | A pill whose word rolls vertically through a reel, one word per beat, with a small overshoot. |
| [Text columns converge](text-column-converge.md) | `doodle-shots-motion:2.95` | `typography.js` | Columns of lines slide in from both sides and meet in the middle; a middle column rises from below. |
| [Title demotes to a label](title-demote-to-label.md) | `doodle-shots-motion:2.96` | `typography.js` | The big title shrinks, moves and recolours into the small label of the section it introduced (A), or hands over to a separate label (B). |
| [Type assembly: split stagger, drift, text on a path](type-assembly-moves.md) | `doodle-shots-motion:2.97` | `typography.js` | Characters that rise and unblur in sequence, characters that drift in from scattered positions, and live text running along a curve. |
| [Letter drop with bounce](type-entrance-moves.md) | `doodle-shots-motion:2.98` | `typography.js` | Letters fall from above and bounce to rest, squashing on first contact. |
| [Type on the rhythm: weight pump and karaoke fill](type-rhythm-sync.md) | `doodle-shots-motion:2.99` | `typography.js` | Type whose weight pumps on every beat, and a sentence that fills with colour as each word is spoken. |
| [Vertical word roll with blur](vertical-word-roll-blur-cycle.md) | `doodle-shots-motion:2.101` | `typography.js` | Words roll up through one slot, blurring and fading out as they leave and unblurring as they arrive, endlessly or to a stop. |
| [Word relay on a filmstrip](word-relay-filmstrip.md) | `doodle-shots-motion:2.102` | `typography.js` | Words in frames on a filmstrip: each step the strip is thrown one cell with an overshoot and the centre word lights up. |
| [Avatar bracket carousel](avatar-bracket-carousel.md) | `doodle-shots-motion:2.104` | `ui-entrance.js` | Avatars on a carousel with [ ] brackets that pinch in on the centre one every step. |
| [Bézier sources converge and merge](bezier-source-converge-merge.md) | `doodle-shots-motion:2.105` | `ui-entrance.js` | Several sources send chips along curved paths that draw as they travel and merge into one result node. |
| [Card stack](card-stack.md) | `doodle-shots-motion:2.106` | `ui-entrance.js` | A fanned stack of cards; every step the top card is thrown to the right and slips under the stack. |
| [Cloner depth echo](cloner-depth-echo.md) | `doodle-shots-motion:2.108` | `ui-entrance.js` | An element and a trail of echoes of it: each a little later, smaller, softer and fainter. |
| [Deck deal fly-in, then orbit open](deck-deal-flyin.md) | `doodle-shots-motion:2.109` | `ui-entrance.js` | A pile deals out to a grid with accelerating gaps, each card flipping face up, then the deck orbits open into a ring. |
| [Contact shadow lift](element-body-moves.md) | `doodle-shots-motion:2.112` | `ui-entrance.js` | An element lifts off the ground and its shadow spreads, softens and fades as the height grows; it lands with a bounce and the shadow tightens. |
| [Integration hub map](integration-hub-map.md) | `doodle-shots-motion:2.113` | `ui-entrance.js` | A hub tile with logo tiles around it: connectors draw out and each tile pops and glows in the order it is spoken. |
| [List stack press](list-stack-press.md) | `doodle-shots-motion:2.115` | `ui-entrance.js` | A list of rows; a finger presses one and the stack compresses around it, then springs back. |
| [Neon frame forerunner](neon-frame-forerun.md) | `doodle-shots-motion:2.116` | `ui-entrance.js` | A short bright runner circles a frame and the neon outline draws behind it. |
| [Neon frame orbit and drop](neon-frame-orbit-drop.md) | `doodle-shots-motion:2.117` | `ui-entrance.js` | A dot orbits a neon frame, then drops into the middle with a bounce and the frame lights up fully. |
| [Page waterfall wall](page-waterfall-wall.md) | `doodle-shots-motion:2.118` | `ui-entrance.js` | A tilted wall of columns scrolling at different speeds and directions: a screenshot wall. |
| [Product card, progressively assembled](product-card-progressive-assemble.md) | `doodle-shots-motion:2.119` | `ui-entrance.js` | A skeleton card with a shimmer that fills in part by part: image, title, price, button. |
| [Radial wave](radial-wave.md) | `doodle-shots-motion:2.120` | `ui-entrance.js` | A ripple expands from the centre; each chip on the ring pops when the front reaches it. |
| [Research card stack into scroll](research-card-stack-scroll.md) | `doodle-shots-motion:2.121` | `ui-entrance.js` | Cards appear as one stack, fan out into a column and then scroll up. |
| [Row embed](row-embed.md) | `doodle-shots-motion:2.122` | `ui-entrance.js` | A list row grows to embed a card inside it, pushing the rows below down; optionally shrinks back. |
| [Value stagger with gradient ramp](value-stagger-gradient.md) | `doodle-shots-motion:2.123` | `ui-entrance.js` | Tiles whose values count up in turn, each tile's colour read from a ramp at its current value. |
| [Wall reveals: bento light-up and wireframe draw-on](wall-reveal-moves.md) | `doodle-shots-motion:2.124` | `ui-entrance.js` | A bento grid whose cells light up in turn, and a wireframe page drawn on line by line before it fills with colour. |
