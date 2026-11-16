# Phase 11, package P5: shared-file patches (for the orchestrator to apply)

P5 owns new files only. These edits are to shared files; each was applied to a scratch copy and run (the evidence is under each one).

## 1. `tools/renderers/pvk.mjs`: motion blur in linear light (doodle-shots-motion:1.29)

Three replacements. `blurSpec` and `linearBlurFilter` are in `tools/p5-blur.mjs`.

```diff
 import { launch } from "../browser.mjs";
+import { blurSpec, linearBlurFilter } from "../p5-blur.mjs";
```
```diff
-export const blurOf = (P) => { const m = P.motionBlur; if (!m) return null;
-  return { shutter: Number(m.shutter ?? 180), samples: Math.max(2, Math.round(Number(m.samples ?? 8))) }; };
+export const blurOf = (P) => blurSpec(P);   // project.json motionBlur or --blur auto|N; linear light unless { linear: false }
```
```diff
-        "-vf", `${ALPHA ? "premultiply=inplace=1," : ""}tmix=frames=${MB.samples}${ALPHA ? ",unpremultiply=inplace=1" : ""},select=eq(n\\,${MB.samples - 1})`, "-frames:v", "1", "-update", "1",
+        "-vf", MB.linear ? linearBlurFilter(MB.samples, { alpha: ALPHA }) : `${ALPHA ? "premultiply=inplace=1," : ""}tmix=frames=${MB.samples}${ALPHA ? ",unpremultiply=inplace=1" : ""},select=eq(n\\,${MB.samples - 1})`, "-frames:v", "1", "-update", "1",
```

Evidence: a 320x180 pvk film (white 40 px box over black, 150 px/s) rendered through `pvk(DIR, P, "frames", [20, 21])` with shutter 360 and 8 samples; the pixel value across the leading edge
is 188 in linear light, 129 with `{ linear: false }` (the current behaviour), 1 with blur off. Existing films that set `"motionBlur": true` change look (the streaks are brighter,
as light adds); `{ "motionBlur": { "linear": false } }` keeps the old averaging. `docs/playbook/motion-blur.md` should say so.

## 2. `bin/reelwright.mjs`: `--blur auto|N` and `--formats` with any WxH (1.29, 1.51)

```diff
 // Plug-in commands (tools/commands/<name>.mjs; each file's header comment is its help, listed below):
+import { sizeOf } from "../tools/p5-formats.mjs";
 import fs from "node:fs";
@@
 if (lg >= 0) process.env.REELWRIGHT_LANG = args.splice(lg, 2)[1];
+const bl = args.indexOf("--blur");   // frames: motion blur averaged in linear light (tools/p5-blur.mjs): auto or a sample count
+if (bl >= 0) process.env.REELWRIGHT_BLUR = args.splice(bl, 2)[1] || "auto";
 const nc = args.indexOf("--no-cache");   // frames: render every frame (tools/renderers/pvk.mjs frame cache off)
@@
-if (formats && (!formats.length || formats.some((f) => !SIZES[f]))) {
-  console.log(`--formats takes a comma list of ${Object.keys(SIZES).join(", ")}`); process.exit(1);
+if (formats) {   // the named shapes or any WxH with even sides (tools/p5-formats.mjs)
+  try { if (!formats.length) throw new Error(`it takes a comma list of ${Object.keys(SIZES).join(", ")} or WxH sizes`); for (const f of formats) SIZES[f] ??= sizeOf(f); }
+  catch (e) { console.log(`--formats: ${e.message}`); process.exit(1); }
 }
```
Also add `--blur auto|N` and "or any WxH (even sides)" to the header comment's flag list.

Evidence: `reelwright stills projects/t --formats 1200x628` wrote `stills-1200x628/` with 1200x628 JPEGs; `1201x628` exits 1 with "both sides must be even ... use 1202x628"; `wide` and an empty list exit 1 with their own messages;
`9x16` still works.

## 3. `tools/shots.js`: no 3D transform at zero tilt (a determinism finding, not a parity row)

`KIT.camCSS` always writes `rotateY(0deg) rotateX(0deg)`. Chromium composites an element with a 3D transform function, and overlays stacked over that layer then rasterise differently depending on the
frames drawn before in the same page (the p5 doodle fixture: one frame in twelve differed between a forward and a shuffled pass with an identical DOM). Proposed:

```diff
-      transform: `translate(${n4(K.W_ / 2 - c.x)}px, ${n4(K.H_ / 2 - c.y)}px)${tilt && c.persp > 0 ? ` perspective(${n4(c.persp)}px)` : ''} rotateY(${n4(c.ry)}deg) rotateX(${n4(c.rx)}deg) rotateZ(${n4(c.rz)}deg) scale(${n4(c.z)})`,
+      transform: `translate(${n4(K.W_ / 2 - c.x)}px, ${n4(K.H_ / 2 - c.y)}px)${tilt && c.persp > 0 ? ` perspective(${n4(c.persp)}px)` : ''}${tilt ? ` rotateY(${n4(c.ry)}deg) rotateX(${n4(c.rx)}deg)` : ''} rotateZ(${n4(c.rz)}deg) scale(${n4(c.z)})`,
```
Evidence: the doodle fixture with the 3D camera showed `<<` mismatches at t = 2.7273 (shuffled pass); with this `camCSS` injected into the page, no frame differs. Risk: it can change the pixels of existing films that use `KIT.shoot` with no tilt (raster
differences at the sub-pixel level), so run the pvk `example` frame-identity check before taking it. `tools/selfcheck/p5/doodle.mjs` moves its scene with a 2D transform to avoid the problem, and checks the projection against the real `KIT.shoot`.

## 4. Index lines (optional)

- `docs/recipes/README.md`: add `one-world.md`: one canvas, one camera (`KIT.world`).
- `docs/PLAYBOOK.md`: stitch `docs/playbook/p5-motion.md`, `p5-text-media.md`, `p5-delivery.md`, `p5-deck.md` (new topic files; the rule in docs/playbook/README.md).
- `package.json` / CI: nothing. `tools/selfcheck/p5-motion.mjs` and `p5-tools.mjs` are picked up by the existing loop over `tools/selfcheck/*.mjs`.
- Skill update: `.claude/skills/product-video` (or the CLI skill) should list the new commands `animimg`, `brand`, `deck`, `gate`, `narrate`, `ship`; their headers are the help text.
