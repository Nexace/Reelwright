# Optional Manim scenes (checkpoint 10i)

Most of what Manim authors do day to day (axes, plots, Write, morphs, equations, 3D surfaces) is native in Reelwright now —
`KIT.math`, `KIT.tex`, `KIT.math3d` (docs/playbook/math2.md) — and stays offline and pure in t. Use Manim itself only for what
JS will not reach: full LaTeX, Pango text, Manim plugins, scenes you already have.

**Opt-in, never bundled.** Core stays Node + ffmpeg + edge-tts. Manim lives in one shared venv, `<repo>/.venv-manim`
(gitignored), created only when you run the install command. A Manim scene is one layer inside a normal film: it is rendered
to a cached alpha clip and played by `KIT.manim(id)`.

> **Status.** The Node side (driver, cache, `verify`, `KIT.manim` playback in pvk and HyperFrames) is tested in CI with a fake
> Manim. The real Manim CE render path — `ce.py`, `doctor`, `hello.py` — is **not verified on this machine** until
> `reelwright manim <p> doctor` passes for you. **ManimGL** has an adapter and tests that skip when it is absent; it is **not
> verified on this machine** and never installed by us (it needs an OpenGL 3.3 context, so it is local-only, never CI).

## Install (once)

```bash
reelwright manim <project> install ce          # prints the plan and sizes, downloads nothing
reelwright manim <project> install ce --yes    # Python 3.12 via uv + manim[typst]==0.22.1, about 125 MB
reelwright manim <project> doctor              # renders a 1 s probe; reports the venv's path and size
```

- macOS needs cairo first (pycairo compiles): `brew install cairo pkg-config`. Linux prints the apt/dnf/pacman lines.
- `install --yes` skips the download when the venv already exists and imports the pinned Manim.
- Typst renders equations, so **no TeX is needed** (`MathTypst`). Real LaTeX (`MathTex`) needs a TeX install you manage yourself.
- `reelwright clean` removes a project's `.cache/` — the rendered Manim clips — **not** the install. Re-run `render` after a clean.
- Manim CE and ManimGL are MIT; nothing of them is vendored. pycairo is LGPL/MPL and stays in your venv.

## A scene in a film

`project.json`:

```json
"manim": { "engine": "ce", "scenes": [
  { "id": "proof", "file": "manim/proof.py", "class": "Proof", "anchor": "L2", "pre": 0.3, "alpha": true } ] }
```

`anchor` is a VO line id: scene t = 0 is that line's start minus `pre`, so film times still come from the script. In the scene:

```python
from reelwright_manim.names import *      # RWScene, Create, MathTex, … (CE or GL by RW_MANIM)

class Proof(RWScene):
    def construct(self):
        rw = self.rw
        rw.at(rw.word("L2", "pipeline"))                       # wait to the spoken word
        rw.over(rw.word("L2", "pipeline"), rw.word("L2", "grows"), Create(curve))
        rw.mark("pop")                                         # a film time you can read in film.js
```

`rw`: `word(line, word, nth)`, `line(id)`, `line_end(id)`, `beat(k)`, `bar(k)`, `snap(t)`, `until(t)`, `at(t)`, `over(t0, t1, *anims)`,
`mark(name)`, `color(name)`, `font(kind)`, `label_illustrative()`. Every `play`/`wait` is frame-quantised: the wrapper asks for
`(n − 0.5)/fps` so the engine renders exactly n frames, and the clip's frame count is asserted. Don't call `add_sound`
(Manim audio is discarded; the mix is Reelwright's).

Film side (`film.js` / `hf/film.js`), after the data file and `manim.js`:

```html
<script src="../.cache/manim/data.js"></script>   <!-- pvk;  hyperframes: kit/manim/data.js -->
<script src="../../../tools/manim.js"></script>   <!-- hyperframes: kit/manim.js -->
```
```js
const mn = KIT.manim('proof');            // throws if the clip is missing or stale
// in render(t):  mn.set(t);              // hidden outside the scene's window
KIT.cue(mn.markAt('pop'), 'pop');
```

## Commands and caching

```bash
reelwright manim <p> render [--force]   # run after `sched`, and after any VO or scene change
reelwright manim <p> verify             # clip hashes, frame counts, data.js
```

- **`all` does not run Manim.** Run `render` yourself after `sched`; `KIT.manim` fails loudly when a clip is missing or stale
  (its start no longer matches the anchor line, or fps/size changed), naming the command to run.
- The clip is cached by the hash of the scene file, the local `.py` files it imports, the `reelwright_manim` sources, the
  timing and theme the scene sees, the engine and the Manim version. Editing a VO line re-renders it.
- Frames are extracted from a lossless alpha `.mov` (never CE's png-sequence, which writes one frame for a static hold).
- Alpha clips composite over themes, captions and cameras. HyperFrames preloads every frame (memory grows with clip length: the
  page warns above 1800 frames per scene).
- Formats: size and fps must match the film; `--formats 9x16` needs a re-render at that size (no `perFormat` yet).

## Not built

`"renderer": "manim"` (whole-film mode), `manifest`/`verify`/`qa` hooks (shared files untouched; use `manim <p> verify`), the
`texts.json` layout lint, hashing fonts and Python/ffmpeg versions, ManimGL's wgpu master.
