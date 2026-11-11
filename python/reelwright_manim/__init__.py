"""reelwright_manim: Reelwright's optional Manim renderer (Python half).

A Manim scene rendered by this package is one clip inside a normal Reelwright film. The Node side
(tools/manim.mjs) writes kit.json (VO word times, beat grid, theme, fonts) and runs
`python -m reelwright_manim render ...`; this package renders the scene to DIR/scene.mov and writes
DIR/marks.json. Scenes subclass `reelwright_manim.ce.RWScene` (Manim CE 0.22.1) or
`reelwright_manim.gl.RWSceneGL` (ManimGL 1.7.2) and time everything through `self.rw` (see core.py).

Timing contract: scene t=0 is film time `t0`; clip frame i shows film time t0 + i/fps; the clip is exactly
round(dur*fps) frames. Every play/wait goes through the frame quantiser (core.run_time_for).

Licences: Manim Community (CE) and ManimGL are both MIT. Neither is vendored: the user installs one into a
separate venv (.venv-manim) and this package only imports it at render time. core.py imports no Manim and
runs on Python 3.9+.
"""
