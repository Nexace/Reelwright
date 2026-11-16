# Variables, batch, stills and compare

One film, many versions: declare what changes (a title, an accent colour, a logo) as **composition variables**, then
render one film per row of data (`batch`), look at any moment of a film closely (`stills` with `--zoom` and `--against`)
or put variants side by side (`compare`, `grade-compare`).

## Composition variables (`tools/variables.js`)

Same model as HyperFrames' `data-composition-variables`: seven types, a default each, overrides on top.

| type | value | notes |
|---|---|---|
| `string`, `color` | a string | `color` is any CSS colour |
| `number` | a finite number | |
| `boolean` | `true` / `false` | |
| `enum` | one of `options` | `options`: strings or `{ value, label }` |
| `font` | `{ name, source }` or a family string | the family name is bound; load the face yourself |
| `image` | `{ url, alt?, fit? }` or a url string | |

Declare them in `project.json` (or, as in HyperFrames, in `<html data-composition-variables='[…]'>`; project.json wins):

```json
"variables": [
  { "id": "title",  "type": "string", "label": "Title",  "default": "Spring launch" },
  { "id": "accent", "type": "color",  "label": "Accent", "default": "#2f9e6b" },
  { "id": "tone",   "type": "enum",   "label": "Tone",   "default": "calm", "options": ["calm", "loud"] }
]
```

Load the kit script and the values file in the page (hf: after `kit/engine.js`; pvk: `../../../tools/variables.js`):

```html
<script src="kit/variables.js"></script>   <!-- KIT.vars -->
<script src="kit-vars.js"></script>        <!-- the values for this build; write it with: reelwright batch <name> --defaults -->
```

Use them from three places, all fixed for the whole render, so `render(t)` stays a pure function of `t`:

- **film.js**: `const v = KIT.vars();` then `v.title`, `v.tone`, `v.logo.url`... Read them at load, build the DOM from them.
- **markup**: `<h1 data-var-text="title">`, `<img data-var-src="logo">` (media tags only, http(s)/blob/`data:image` urls), and CSS
  `background: var(--accent)`: `KIT.vars.bind()` runs at `KIT.start` and sets the text, the `src` and a `--<id>` property on `#stage`.
  (The HyperFrames runtime does the same on its own; both write the same values.)
- **checks**: `batch --check`, `batch`, `--variables` and `--defaults` run these before anything renders. Codes:
  `variables_not_array`, `invalid_declaration`, `invalid_variable_id`, `duplicate_variable_id`, `invalid_variable_type`,
  `invalid_enum_options`, `missing_default`, `default_type_mismatch`, `variable_type_mismatch`, `variable_enum_out_of_range`,
  `undeclared_variable` (a warning; an error with `--strict`), `unknown_variable_binding` (a `data-var-*` naming nothing),
  `variable_src_not_media`, `unknown_variable_usage` (`KIT.vars().x` in film.js with no `x` declared).

A wrong value never renders: `KIT.vars()` throws in the page too, with the variable and the expected type.

### One-off values: `--variables`

```
reelwright film  <name> --variables '{"title":"Hello"}'
reelwright all   <name> --variables-file vars.json --strict-variables
reelwright stills <name> --frames 4 --variables '{"tone":"loud"}'
```

Any command takes them: they are checked, written to the page's `kit-vars.js` for that run, and the old file is put back
when the command ends (also on failure). `--strict-variables` makes a key that is not declared an error.

## Batch render

```
reelwright batch <name> rows.json [--concurrency 2] [--fail-fast] [--out-dir dir] [--strict] [--keep-work]
reelwright batch <name> rows.csv   # header = variable ids; number and boolean columns are read as such
reelwright batch <name> rows.json --check   # validate only
```

`rows.json` is an array of objects, one per film: variable ids to override, and optionally `_name` for the file name
(`row-01`, `row-02`... otherwise). Unset ids keep their default.

```json
[ { "_name": "acme",  "title": "Acme", "accent": "#e33" },
  { "_name": "globex", "title": "Globex", "tone": "loud" } ]
```

- Every row is checked first. One bad row stops the batch before anything renders, with the row, the variable and the reason.
- Each row builds in a copy of the project (a sibling folder `.batch-<name>-<row>`, removed after; `vo/`, `clips/`, `assets/`
  and `music/` are linked, not copied) with `film`, so your project folder, its `kit-vars.js` and its `out/` are untouched.
- `--concurrency N` rows at a time (default 1). `PAGES` (render workers per film) is divided between them.
- A row that fails (page error, render error) is reported and the others still run. `--fail-fast`: no new row starts after the first
  failure and running ones are stopped. Exit code 1 if any row did not finish.
- Output: `<out-dir>/<_name>.mp4` (+ `.srt`, `.vtt`, `.manifest.json`; default `out/batch/`) and `batch.json`:
  `{ project, concurrency, ok, failed, seconds, rows: [{ index, name, status, out, variables, seconds, error? }] }`,
  status `ok`, `failed`, `cancelled` (stopped by `--fail-fast`) or `skipped` (never started).

## `stills` with more options (`tools/commands/stills2.mjs`)

```
reelwright stills <name> --frames 6                      # 6 evenly spaced (default without any option: 12)
reelwright stills <name> --at 1.5,4,9.2                  # same as the positional list
reelwright stills <name> --range 2-6:0.5                 # every 0.5 s from 2 to 6
reelwright stills <name> --range 2-6 --frames 5          # 5 frames from 2 to 6, ends included
reelwright stills <name> --at 4 --zoom ".card"           # crop to the selector's box → stills/zoom-t004.00.jpg + zoom-sheet.png
reelwright stills <name> --at 1,4 --against ref.mp4      # compare with a reference video
```

- `--zoom <selector>` measures the element in the film's own page at that moment (union of the visible matches), crops the real
  still around it (`--pad` px, default 24) and enlarges it up to ×3. A selector that matches nothing visible fails and names the time.
- `--against ref.mp4` writes for every moment `ref-t*.png`, `mine-t*.png`, `diff-t*.png` (differences ×4), `against-sheet.png`
  (ref, this film, difference) and `against.json` with the SSIM per moment (1 = identical). The reference is scaled to the film's
  frame; a moment past its end uses its last frame and is marked `held`. With `--zoom`, both are cropped the same. `--min-ssim x`
  exits 1 when a moment scores lower.
- Without `--zoom` or `--against` the usual `stills/sheet.jpg` is written. `stills` with these options is `stills2`; the plain
  `stills t,t` is unchanged.
- hyperframes stills are the nearest 10 fps frame (±0.05 s), pvk stills are exact. For an exact reference match, build the frames.

## Compare variants: `compare`, `grade-compare`

```
reelwright compare projects/a projects/a@bold-poster ref.mp4 stills-folder --at 2,6 --labels base,poster,ref,old --out look.png
reelwright grade-compare shot.png --presets warm-daylight,mono-clean,vhs-playback --out grades.png
reelwright grade-compare clip.mp4 --at 3 --presets all --intensity 0.6
```

`compare` makes one PNG, a row per variant and a column per time, every cell labelled. A variant is a project (its stills are
rendered; `name@style` builds it in another theme; the project's own `stills/` is left alone), a video, or a folder of stills
named `t<time>.jpg`. Next to the PNG, `<out>.json` lists each cell's label and position.

`grade-compare` takes one image or one video frame (`--at`) through HyperFrames' own colour-grading presets (grade presets by
default, `effect` or `all`, or a list; the names `KIT.grade` takes) and labels each tile. The tiles are drawn by the HyperFrames
runtime, so they match what `KIT.grade` gives in a render.

## Self-checks

`node tools/selfcheck/p1-variables.mjs`, `p1-batch.mjs`, `p1-stills.mjs`, `p1-compare.mjs`: offline, they build a tiny project
(`p1-fixture.mjs`) and check pixels in the pages, the mp4 files and the sheets.
