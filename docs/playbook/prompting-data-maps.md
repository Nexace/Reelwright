# Prompting cookbook: data and maps

Prompts to give the agent when a film needs a chart, a number, a table of figures or a map, with the commands it should run and what to check. The agent reads AGENTS.md and the PLAYBOOK first; these add the specifics.

Rules that apply to every prompt below: numbers that are not real carry an "Illustrative data" label (`note: 'Illustrative data'` on a layout), every time comes from `V()`, `W()` or `KIT.snap()`, and `render(t)` stays a pure function of `t`.

## 1. A bar chart that grows on the beat

> Make a bar chart scene for these five numbers: Q1 12, Q2 18, Q3 26, Q4 31, Q5 44 (real, from our report). Bars rise one after another starting on the beat after the line "growth is accelerating", the last bar in the accent colour. Follow `docs/recipes/chart-grows.md`.

Commands: copy the recipe, `./video.sh stills <name>`, read `stills/sheet.jpg`. Check: the last bar is the accent colour, the labels are at least 44 px at 1080 wide, no "Illustrative data" label because the numbers are real.

## 2. A curve with axes (KIT.math)

> Plot revenue against months as a line with axes and a point that moves along it as the voice says "and then it took off". Use `KIT.math.axes`, `KIT.math.plot` and its `pointAt`. Axes range 0 to 12 months, 0 to 100.

The agent should call `KIT.math.axes({ x: [0, 12, 2], y: [0, 100, 20], ... })`, then `plot(axes, f, { x: [0, 12], draw })` and read `pointAt(progress)` inside `render(t)`. See `docs/playbook/` PLAYBOOK, "Math". Check: the draw-on starts at the spoken word (`W()`), not at a typed second.

## 3. A big number

> Show 4.2 million users as a number that counts up on the word "million", with a "Source: annual report 2025" credit.

Use `KIT.layout.stat({ value: 4.2, suffix: ' million', decimals: 1, at: KIT.W('<lineId>', 'million'), in, out, note: 'Source: annual report 2025' })`. A data-like number needs either that credit or the "Illustrative data" label, or the `illustrative` QA gate fails.

## 4. A map

> Add a map scene showing our three offices. Use the catalog's map blocks.

Commands:

```bash
node bin/reelwright.mjs catalog --tag map          # the supported map blocks (and --all for the ones that cannot run here)
node bin/reelwright.mjs add <project> <block>      # prints the variables and the KIT.mount usage line
```

Map blocks run in hyperframes films only. They load d3, topojson and the atlas files from the vendored kit, so they work offline. Set the variables from the printed list (`KIT.mount('<block>', { start, dur, vars: { ... } })`), and check the still at the middle of the block.

## 5. Data from a file

> Read `sales.csv` and make the chart from it.

Read the CSV at build time (Node, before writing `film.js`) and paste the numbers into `film.js` as a constant array. Do not `fetch` at render time: a render must give the same pixels every run, and a network call does not. Keep a comment with the file name and date.

## 6. Scales and shapes from d3 (no transitions)

> Use d3 scales to place 40 points on a scatter.

d3 is vendored and copied to `hf/kit/d3/`. Use only pure functions of the data: `d3.scaleLinear`, `d3.line`, `d3.Delaunay`. Never `d3.transition` or `d3.timer`: they run on the wall clock. Position everything from `render(t)`. The playbook page `docs/playbook/runtimes.md` lists what is allowed.

## What to look at before saying done

- `stills/sheet.jpg` with the chart at its final state and at the half-way point.
- `./video.sh qa <name>`: the `illustrative` gate, the `seekable` gate (no timers), and the taste WARN lines.
- `node bin/reelwright.mjs check <name>`: axis labels running off the frame.
