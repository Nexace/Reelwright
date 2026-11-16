# Text size and safe area (Remotion `video-layout` rules, as Reelwright defaults)

Remotion's video-layout guidance for a 1080-wide frame, written here in `KIT.u` units (`KIT.u = min(width, height) / 1080`, so the numbers hold at
any size and in every `--formats` cut):

| What | At 1080 wide | In code |
|---|---|---|
| Headline, smallest | 84 px | `84 * KIT.u` |
| Supporting text, smallest | 44 px | `44 * KIT.u` |
| Safe area, left and right | 80 px | `80 * KIT.u` |
| Safe area, top and bottom | 100 px | `100 * KIT.u` |

Use them as the defaults for a film that is watched on a phone: a headline under 84 px or supporting text under 44 px (at 1080 wide) is
what gets lost on a small screen. They are minimums for text the viewer has to read, not for logos, captions' background or a quoted UI.

How they sit with what the repo already checks:

- `KIT.safe` is the title-safe box per format (6 % at the sides and 8 % top and bottom at 16x9). On 1080x1920 that is 65 px and 154 px: use
  `KIT.safe` for placing, and these minimums when you pick sizes.
- `qa` warns about text under 24 px * `KIT.u` (tiny text). The 84 px / 44 px minimums are the design target; 24 px is the floor below which a
  frame fails to read at all.
- `tools/checks/safe-zone.page.mjs` flags text outside the safe box.
- `KIT.fitText({ text, withinWidth, fontFamily })` and `KIT.fitTextOnNLines(...)` (tools/text-measure.js) give the size that fills a box, so a long
  headline shrinks to fit instead of overflowing; check the result is still >= `84 * KIT.u`, or cut words.

Quick check in a film: `const H = Math.max(84 * KIT.u, KIT.fitText({ text, withinWidth: KIT.safe.w, fontFamily }).fontSize)` never goes under
the minimum (it may then overflow the width: shorten the line).

## Typographic animation (`KIT.text`, tools/text-split.js)

A headline that moves is still text: it has to be measured once, at load, and then only moved. `tools/text-split.js`
(load after `engine.js`) splits a string into lines → words → glyphs with `measureText` and animates that split as a pure
function of `t`; nothing in it measures text inside `render(t)`.

| Call | What it does |
|---|---|
| `KIT.text.split(str, { font, size, weight, tracking, lineHeight, maxWidth })` | → `{ lines: [{ text, x, y, width, glyphs: [{ ch, x, w }] }], width, height }`. Breaks on `\n` and at `maxWidth` on spaces; `y` is the line's baseline, glyph `x`/`w` are advances from the line's left edge with tracking (no pair kerning: this is display type). Cached by every input, so a second identical call measures nothing. A declared `@font-face` family with no loaded face throws instead of measuring the fallback (a family with several faces passes as long as one is loaded). |
| `KIT.text.reveal(host, split, { by, mask, stagger, from, dur, ease, at, tracking, axes })` | → `{ set(t), end }`. `by: 'lines' \| 'words' \| 'chars'`, `from: 'start' \| 'center' \| 'edges'`. A mask is one `clip-path: inset(0)` per line, `lineHeight · 1.15` tall so descenders fit, with the line translated down by that height at `p = 0` and 0 at `p = 1`: it wipes up from behind its line box instead of fading. A `<canvas>` host gets the same reveal as clipped strips. `axes` needs a DOM host: a `<canvas>` draws through `ctx.font`, where `font-variation-settings` do not apply, so axes on a canvas throws. |
| `KIT.text.axes(font, axes, { variable })` | → `(p) => 'font-variation-settings'`. Validates once: a tag that is not an OpenType axis throws, a family with no loaded face throws, and so does a family declared with single weights only (that axis would do nothing). |
| `KIT.text.maskLines(el, { lineHeight, pad, apply })` | → `{ lines: [{ x, y, width, height }], clip }`: one box per rendered line of a static element, and (with `apply`) its `clip-path`. |

**Tracking** animates `letter-spacing` per line — `tracking: [0.06, 0.01]` in em — so the spacing stays even; a per-glyph
version makes the letters drift apart.

**Variable fonts.** `axes: { wght: [400, 700], opsz: [14, 72], GRAD: [0, 80] }` interpolates `font-variation-settings`
over the entrance. `font-optical-sizing: auto` already picks `opsz` from the size, so animating the size and also setting
`opsz` by hand fights it; the reveal sets `font-optical-sizing: none` when `opsz` is animated. `GRAD` adds weight without
changing advance widths, which is what you want when the line must not reflow. **Never fake weight or emphasis by scaling
text**: it blurs the glyphs and changes the spacing. Animate `wght` / `GRAD` / `opsz`. A theme that ships one static file
per weight has no axes — the call throws rather than silently doing nothing.

For deterministic frames: build the split and the reveal at load (after `document.fonts.ready`, which `K.start` waits for),
pin the family in `split`'s `font`, and call `set(t)` from `render(t)`. `KIT.type` (cps typing) stays the right call for a
terminal; this is for display type.

Proof: `node tools/selfcheck/text-split.mjs` — glyph boxes against the canvas, mask geometry, hidden at `t = 0` and visible
at `t = dur`, tracking changing advance widths, the axis errors, and shuffled seeks with pixel assertions in pvk and
HyperFrames.
