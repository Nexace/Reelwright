# HyperFrames blocks — `reelwright add <block>` + `KIT.mount`

HyperFrames' registry has 210 *blocks*: full 5–30 s scenes (lower thirds, carousels, mock UIs, code scenes, shader
transitions, 3D titles). The ones that run deterministically here are vendored, converted, in
`vendor/hyperframes/registry/blocks/` (list: [CATALOG.md](../../vendor/hyperframes/registry/blocks/CATALOG.md); the
rest and why: [UNSUPPORTED.md](../../vendor/hyperframes/registry/blocks/UNSUPPORTED.md)). hf films only.

```sh
reelwright add --list [tag]           # supported blocks (and catalog components), e.g. --list lower-third
reelwright add my-film lt-neon-border  # → hf/compositions/lt-neon-border.html (+ compositions/lt-neon-border/ fonts, assets)
```

`add` prints the title, duration, size, every variable with its default, and the usage line:

```html
<script src="kit/engine.js"></script>
<script src="kit/compose.js"></script>   <!-- KIT.mount / KIT.block(name, {…}) -->
<script src="film.js"></script>
```

```js
// film.js — times from the script, never from the block
const lt = KIT.mount('lt-neon-border', { start: W('name', 'Ada'), dur: 4.8, vars: { name: 'Ada Lovelace', role: 'Analyst' } });
KIT.css(lt, { transform: `scale(${KIT.u})`, transformOrigin: '0 0' });   // the host is the block's own size
// same thing: KIT.block('lt-neon-border', { start: W('name', 'Ada'), dur: 4.8, vars: { … } })
```

- 123 of 210 upstream blocks are here (verified under the HyperFrames runtime); none of the html-in-canvas
  (`drawElementImage`) blocks passed.
- `dur` can be shorter than the block (it cuts) or longer (it holds the last frame). `playbackStart` skips into it.
- The host is the block's size (`width`×`height` in CATALOG.md); a 1080×1920 block in a 16x9 film needs scaling.
- `vars` override the defaults `add` printed. Image variables whose upstream sample had no known licence default to a
  transparent pixel: pass your own image (a path relative to `hf/index.html`).
- Mount each block once: blocks look up their own elements by id.
- pvk films: `add` refuses blocks. They are verified only under the HyperFrames runtime (they wait on
  `window.__hf.buildReady`, which pvk's READY doesn't).
- Fonts are bundled ones (CATALOG.md notes say where a block's family was replaced by the nearest bundled family).
- Blocks look like HyperFrames' samples, not like your theme: restyle through their variables, or with CSS in
  `hf/index.html` under `[data-composition-id="<id>"]`.

Maintainers: `node tools/blocks.mjs import <upstream registry/blocks>` (re-import on a HyperFrames update),
`verify [names…]`, `render <out> <names…>`; what the conversion does: vendor/hyperframes/VENDORED.md "Blocks".
CI: `tools/selfcheck/blocks.mjs`.
