"""texts.py with stand-in mobjects (no Manim): boxes in output pixels, visibility, font size, nesting, snapshots, texts.json."""
import json
import os
import tempfile
import unittest

from reelwright_manim import texts


class Text(object):
    """Stand-in with the methods texts.py reads from a Manim Text."""
    def __init__(self, text, cx, cy, w, h, font_size=48, opacity=1.0):
        self.text, self.font_size, self.submobjects = text, font_size, []
        self._b = (cx - w / 2.0, cx + w / 2.0, cy + h / 2.0, cy - h / 2.0)
        self._o = opacity

    def get_left(self): return [self._b[0], 0, 0]
    def get_right(self): return [self._b[1], 0, 0]
    def get_top(self): return [0, self._b[2], 0]
    def get_bottom(self): return [0, self._b[3], 0]
    def get_fill_opacity(self): return self._o
    def get_stroke_opacity(self): return 0.0


class Group(object):
    def __init__(self, *kids): self.submobjects = list(kids)


class Cam(object):
    frame_width, frame_height, frame_center = 16.0, 9.0, (0.0, 0.0, 0.0)


class Scene(object):
    camera = Cam()

    def __init__(self, *m): self.mobjects = list(m)


class RW(object):
    fps, t0, dur, now = 30.0, 2.0, 10.0, 3.5

    def __init__(self, state): self.run = {"width": 1920, "height": 1080, "state": state}


class TestTexts(unittest.TestCase):
    def test_box_in_pixels(self):
        # a 4 x 1 unit text centred at (0, 0) on a 16 x 9 frame rendered at 1920 x 1080 (120 px per unit): 480 x 120 at (720, 480)
        rows = texts.collect(Scene(Text("hello", 0, 0, 4, 1)), 1920, 1080)
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual((r["x"], r["y"], r["w"], r["h"]), (720.0, 480.0, 480.0, 120.0))
        self.assertEqual(r["size_px"], 57.6)  # font_size 48 / 100 * 120 px per unit
        self.assertEqual(r["text"], "hello")

    def test_off_frame_box_keeps_negative_coordinates(self):
        r = texts.collect(Scene(Text("wide", 7, 0, 4, 1)), 1920, 1080)[0]
        self.assertEqual(r["x"] + r["w"], 1920 + 120 * 1.0)  # right edge 1 unit past the frame

    def test_hidden_and_nested(self):
        s = Scene(Group(Text("a", -3, 3, 1, 0.5), Group(Text("b", 3, -3, 1, 0.5, opacity=0.0))), Text("c", 0, 0, 1, 0.5))
        self.assertEqual(sorted(r["text"] for r in texts.collect(s, 1920, 1080)), ["a", "c"])

    def test_no_font_size_falls_back_to_line_height(self):
        t = Text("x", 0, 0, 2, 1); t.font_size = None
        self.assertEqual(texts.collect(Scene(t), 1920, 1080)[0]["size_px"], 96.0)  # 0.8 * 120 px

    def test_snapshot_and_write(self):
        with tempfile.TemporaryDirectory() as d:
            rw = RW(os.path.join(d, ".rw-state.json"))
            s = Scene(Text("title", 0, 3, 6, 1))
            texts.snapshot(s, rw, "title")
            rw.now = 6.0
            s.mobjects.append(Text("sub", 0, -3, 3, 1))
            texts.snapshot(s, rw)
            path = texts.write(rw)
            self.assertEqual(path, os.path.join(d, "texts.json"))
            with open(path) as f:
                doc = json.load(f)
            self.assertEqual((doc["width"], doc["height"], doc["t0"], doc["dur"]), (1920, 1080, 2.0, 10.0))
            self.assertEqual([(x["t"], x["label"], len(x["texts"])) for x in doc["snapshots"]], [(3.5, "title", 1), (6.0, None, 2)])


if __name__ == "__main__":
    unittest.main()
