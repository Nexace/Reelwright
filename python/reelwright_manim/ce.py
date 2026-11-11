"""Manim Community (CE 0.22.1) adapter: RWScene, RWMovingScene, RW3DScene with `self.rw` bound to the scene.

Timing contract (see core.py): every rw play/wait asks for (n - 0.5)/fps; waits pass frozen_frame=False
because CE's static-wait shortcut writes int(duration*fps) frames (one short) and the png-sequence writer
keeps one png per hold. The cursor reads CairoRenderer.time (= frames written / fps). tear_down() calls
rw.finish(), which pads to dur and asserts the count.

render_child() runs in the subprocess `python -m reelwright_manim _ce`: it sets CE's config (pixel size,
fps, frame width from the aspect, .mov output, transparent or theme background, caching off, fresh media
dir) and renders the class. Licence: Manim CE is MIT, installed by the user, never vendored.
UNVERIFIED here: written against the 0.22.1 API without a Manim install on the authoring machine.
"""
import importlib.util
import json
import os
import random
import sys
from pathlib import Path

from manim import MovingCameraScene, Scene, ThreeDScene, config, tempconfig

from .core import ENV, from_env


class _RW(object):
    def setup(self):
        super().setup()
        fps = float(config.frame_rate)
        self.rw = from_env(
            play=self.play,
            wait=lambda rt: self.wait(rt, frozen_frame=False),
            frames=lambda: int(round(self.renderer.time * fps)),
        )
        if abs(fps - self.rw.fps) > 1e-6:
            raise RuntimeError("CE frame_rate %s != requested fps %s" % (fps, self.rw.fps))
        seed = int(self.rw.run.get("seed", 0))
        random.seed(seed)
        try:
            import numpy as np
            np.random.seed(seed)
        except ImportError:
            pass
        _register_fonts(self.rw.kit.get("fonts") or [])

    def tear_down(self):
        rw = getattr(self, "rw", None)
        if rw is not None:
            rw.finish()
        super().tear_down()


class RWScene(_RW, Scene):
    pass


class RWMovingScene(_RW, MovingCameraScene):
    pass


class RW3DScene(_RW, ThreeDScene):
    pass


def _register_fonts(paths):
    try:
        import manimpango
    except ImportError:
        return
    for p in paths:
        if not manimpango.register_font(str(p)):
            sys.stderr.write("reelwright_manim: could not register font %s\n" % p)


def render_child(file, cls_name, media):
    run = json.loads(os.environ[ENV])
    file = Path(file).resolve()
    sys.path.insert(0, str(file.parent))
    spec = importlib.util.spec_from_file_location(file.stem, str(file))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[file.stem] = mod
    spec.loader.exec_module(mod)
    cls = getattr(mod, cls_name, None)
    if cls is None:
        raise SystemExit("reelwright_manim: no class %r in %s" % (cls_name, file))
    w, h, alpha = int(run["width"]), int(run["height"]), bool(run["alpha"])
    opts = {
        "renderer": "cairo",
        "input_file": str(file),
        "media_dir": str(media),
        "output_file": "scene",
        "disable_caching": True,
        "write_to_movie": True,
        "save_last_frame": False,
        "preview": False,
        "progress_bar": "none",
        "verbosity": "WARNING",
        "pixel_width": w,
        "pixel_height": h,
        "frame_rate": float(run["fps"]),
        "frame_height": 8.0,
        "frame_width": 8.0 * w / h,
        "format": "mov",
        "transparent": alpha,
        "seed": int(run.get("seed", 0)),
    }
    if alpha:
        opts["background_opacity"] = 0.0
    elif run.get("bg"):
        opts["background_color"] = run["bg"]
    # tempconfig drops keys this CE version does not know; render() verifies size/frames/alpha with ffprobe
    with tempconfig(opts):
        cls().render()
