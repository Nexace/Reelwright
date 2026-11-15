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
- `tools/checks/p5-safe-zone.page.mjs` flags text outside the safe box.
- `KIT.fitText({ text, withinWidth, fontFamily })` and `KIT.fitTextOnNLines(...)` (tools/p9-text.js) give the size that fills a box, so a long
  headline shrinks to fit instead of overflowing; check the result is still >= `84 * KIT.u`, or cut words.

Quick check in a film: `const H = Math.max(84 * KIT.u, KIT.fitText({ text, withinWidth: KIT.safe.w, fontFamily }).fontSize)` never goes under
the minimum (it may then overflow the width: shorten the line).
