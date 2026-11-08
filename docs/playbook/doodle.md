# Doodle depth (Phase 10g): `tools/doodle2.js`

Load it after `doodle.js`: in hf films, `<script src="kit/doodle2.js">` (the kit is copied by glob); in pvk films, the
same way as doodle.js. It adds to `KIT.doodle`. It keeps doodle.js's rules: every mark is a pure function of t and its
id, it is seeded from `D.hash(id)`, and the DOM is measured once, at load. The full API is in the file's header. Demo
film: `projects/doodle2-hf`. Self-check: `node tools/selfcheck/doodle2.mjs`.

## Pen strokes
- `D.stroke(parent, pts, { id, style, in, draw, out })` draws one mark with a hand-pen look. It is a filled **ribbon**
  that tapers in and out (14 % attack, 20 % release) and changes width with pressure. Its edge has a little "bite".
  Draw-on cuts the centreline before the ribbon is built, so the moving tip keeps its taper. At `t ≥ in + draw` you get
  exactly the finished stroke.
- **Styles** (`D.styles`): `pencil` (retrace + grain), `riso`, `marker`, `ballpoint`, `chalk`, `blueprint`. Override any
  field per mark, for example `{ style: 'pencil', w: 5 * KIT.u }`.
- **Retrace** (`retrace: true`) draws a second thin line at 40 % opacity: the sketchy double line.
- **Pencil grain** (`D.grain(svg)`) makes the graphite skip the paper's valleys. The tooth tile is baked in JS from
  `D.noise`, not `feTurbulence`, so frames match on every Chromium build.
- **Boil**: with the doodle theme's `--kit-boil: 8`, lines re-jitter 8 times a second. `D.wobble2` / `D.boil2` are the
  smooth variants, where neighbouring points move together (rubber hose).

## Drawing score and drawSVG
- `D.score(marks, t0, t1)` is a picture that draws itself. Marks run in dependency order (`deps: ['box']`), and each
  gets time in proportion to its ink length, plus 9 px for every pen lift. `o.layers` shows only some layers. The last
  frame is the finished picture. Put `t0`/`t1` on the VO with `W()`/`V()` or `KIT.snap`.
- `D.drawSVG(svg, { t0, t1, style })` animates any inline SVG you bring. Outlines draw on in DOM order, and fills fade
  in after their own outline. At `t1`, every attribute is back to the original.

## Pen lettering
`D.letters(parent, 'HELLO', { size, style, in })` writes text with a pointed nib: wide downstrokes, hairline upstrokes,
and the pen moving at constant speed across the word. The single-stroke alphabet is our own: A–Z, 0–9 and
`. , ! ? - ' : —`. Lower case is drawn as upper case, and other characters throw. Use it for short titles; for body copy,
use a font.

## Depth and seams
- `D.planes([{ el, z }], cam)` gives true depth parallax from one camera `{x, y, zoom}`: a plane at depth z moves 1/z of
  the pan and scales by zoom^(1/z). Pass `zoom` to `D.stroke` and line weight compensates by zoom^-0.35, so lines don't
  get fat in a push-in.
- **Seams** join one scene to the next without a fade. There are six:
  - **foreground-as-transition**: something passes the lens and covers the cut.
  - **persistent actor**: one object stays on screen across the cut.
  - **selection → expansion**: the thing you picked grows into the next scene.
  - **registered decomposition**: the picture splits into parts that line up with the next one.
  - **continuous canvas**: the camera keeps moving over one big drawing.
  - **exploded layers**: the layers fly apart.

  `D.matchedMove({ dir, exitDist, exitDur, entryDur })` gives the numbers for a cut that hides in motion. The exit
  accelerates into the cut, the cut sits on the fastest frame, and the entry leaves at the same speed and decelerates.
