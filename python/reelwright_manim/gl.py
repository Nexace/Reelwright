"""ManimGL (1.7.2, moderngl) adapter: RWSceneGL with `self.rw` bound to the scene. BEST EFFORT, UNVERIFIED.

Timing contract (see core.py): GL writes ceil(run_time*fps) frames per play/wait (np.arange(0, rt, 1/fps)
+ 1/fps) and has no frozen-frame shortcut, so (n - 0.5)/fps lands on n frames. The cursor reads Scene.time
(sum of dt = frames written / fps). tear_down() calls rw.finish() before GL closes the file writer.

`render` runs it as `python -m manimlib file Class -w -r WxH --fps N --video_dir D --file_name scene`
plus `-t` (alpha) or `-c <theme bg>`; `-w` renders offscreen (moderngl standalone context, needs OpenGL 3.3).
Licence: ManimGL is MIT (3Blue1Brown LLC), installed by the user, never vendored.
UNVERIFIED: written against the 1.7.2 API without ManimGL installed; Scene.time, tear_down order, -t codec
and the output path under --video_dir are taken from reading the source, not from a run.
"""
import random
import sys

from manimlib import Scene

from .core import from_env


class RWSceneGL(Scene):
    random_seed = 0

    def setup(self):
        super().setup()
        self.rw = from_env(play=self.play, wait=self.wait, frames=lambda: int(round(self.time * self.rw.fps)))
        seed = int(self.rw.run.get("seed", 0))
        random.seed(seed)
        try:
            import numpy as np
            np.random.seed(seed)
        except ImportError:
            pass
        try:
            import manimpango
            for p in self.rw.kit.get("fonts") or []:
                if not manimpango.register_font(str(p)):
                    sys.stderr.write("reelwright_manim: could not register font %s\n" % p)
        except ImportError:
            pass

    def tear_down(self):
        rw = getattr(self, "rw", None)
        if rw is not None:
            rw.finish()
        super().tear_down()
