"""Engine-neutral tests for reelwright_manim.core (no Manim). Run: python -m reelwright_manim selftest."""
import json
import os
import tempfile
import unittest

from reelwright_manim.core import RW, frames_for, js_round, run_time_for

FPS_SET = (24, 25, 30, 48, 50, 59.94, 60, 120)
KIT = {
    "fps": 60, "width": 1920, "height": 1080,
    "VO": {"L1": {"start": 1.0, "end": 3.0, "words": [
        {"w": "The", "t": 1.0, "d": 0.2}, {"w": "pipeline,", "t": 1.25, "d": 0.4},
        {"w": "grows", "t": 1.7, "d": 0.3}, {"w": "the", "t": 2.1, "d": 0.1}, {"w": "end.", "t": 2.4, "d": 0.3}]}},
    "MUSIC": {"bpm": 120, "beat": 0.5, "bar": 2.0, "t0": 0.25},
    "theme": {"bg": "#000000", "ink": "#ffffff", "accent": "#ff0000", "fontText": "Inter", "fontDisplay": "Fraunces"},
    "fonts": [],
}


class FakeScene(object):
    """Mimics CE/GL: each play/wait writes ceil(run_time*fps) frames."""

    def __init__(self, fps):
        self.fps, self.n, self.calls = fps, 0, []

    def play(self, *anims, **kw):
        self.calls.append(("play", anims, kw))
        self.n += frames_for(kw["run_time"], self.fps)

    def wait(self, rt):
        self.calls.append(("wait", rt))
        self.n += frames_for(rt, self.fps)


def make(t0=1.0, dur=2.0, fps=60, kit=KIT, state=None):
    s = FakeScene(fps)
    return RW(kit, t0, dur, fps, play=s.play, wait=s.wait, frames=lambda: s.n, state=state), s


class Quantiser(unittest.TestCase):
    def test_n_frames_exact(self):
        for fps in FPS_SET:
            for n in range(1, 5001):
                self.assertEqual(frames_for(run_time_for(n, fps), fps), n, (fps, n))

    def test_numpy_arange_agrees(self):
        try:
            import numpy as np
        except ImportError:
            self.skipTest("numpy not installed")
        for fps in FPS_SET:
            for n in (1, 2, 3, 59, 60, 61, 1799, 3600):
                rt = run_time_for(n, fps)
                self.assertEqual(len(np.arange(0, rt, 1 / fps)), n)  # CE get_time_progression
                self.assertEqual(len(np.arange(0, rt, 1 / fps) + 1 / fps), n)  # GL

    def test_zero_frames_rejected(self):
        with self.assertRaises(ValueError):
            run_time_for(0, 60)

    def test_js_round(self):
        self.assertEqual(js_round(2.5), 3)
        self.assertEqual(js_round(-0.5), 0)
        self.assertEqual(js_round(119.99999), 120)


class Cursor(unittest.TestCase):
    def test_script_sums_to_total(self):
        for fps in FPS_SET:
            rw, s = make(t0=0.37, dur=3.3, fps=fps)
            rw.at(rw.word("L1", "pipeline"))
            rw.over(rw.now, rw.word("L1", "grows"), "anim1")
            rw.over(rw.word("L1", "end"), rw.line_end("L1"), "anim2", rate_func="linear")
            rw.finish()
            self.assertEqual(s.n, js_round(3.3 * fps), fps)
            self.assertEqual(rw.frames, rw.total)
            plays = [c for c in s.calls if c[0] == "play"]
            self.assertEqual(plays[-1][2]["rate_func"], "linear")  # kwargs pass through to play

    def test_now_and_landing(self):
        rw, s = make()
        self.assertEqual(rw.now, 1.0)
        rw.at(1.25)
        self.assertEqual(s.n, 15)
        self.assertAlmostEqual(rw.now, 1.25)
        rw.over(1.25, 1.7, "a")
        self.assertEqual(s.n, 42)
        self.assertEqual(s.calls[-1][2]["run_time"], run_time_for(27, 60))

    def test_at_now_is_noop_and_one_frame_tolerance(self):
        rw, s = make()
        rw.at(1.5)
        calls = len(s.calls)
        rw.at(1.5)
        rw.at(1.5 - 1 / 60)  # one frame late: tolerated, no call
        self.assertEqual(len(s.calls), calls)
        with self.assertRaises(ValueError):
            rw.at(1.5 - 2 / 60)

    def test_over_needs_a_frame(self):
        rw, s = make()
        with self.assertRaises(ValueError):
            rw.over(1.5, 1.5, "a")

    def test_past_dur(self):
        rw, s = make()
        with self.assertRaises(ValueError):
            rw.until(3.1)
        s.play("x", run_time=3.0)  # author bypassed rw and overran
        with self.assertRaises(RuntimeError):
            rw.finish()

    def test_author_play_stays_in_sync(self):
        rw, s = make()
        s.play("x", run_time=0.5)  # direct self.play(..., run_time=0.5)
        self.assertAlmostEqual(rw.now, 1.5)
        rw.finish()
        self.assertEqual(s.n, 120)

    def test_finish_idempotent_and_pads(self):
        rw, s = make()
        rw.finish()
        rw.finish()
        self.assertEqual(s.n, 120)
        self.assertEqual(len(s.calls), 1)


class Lookup(unittest.TestCase):
    def test_word_nth_and_normalise(self):
        rw, _ = make()
        self.assertEqual(rw.word("L1", "Pipeline"), 1.25)
        self.assertEqual(rw.word("L1", "the"), 1.0)
        self.assertEqual(rw.word("L1", "the", nth=2), 2.1)
        self.assertEqual(rw.word("L1", "END"), 2.4)

    def test_word_missing(self):
        rw, _ = make()
        for args in (("L1", "nope"), ("L1", "the", 3), ("L9", "the")):
            with self.assertRaises(KeyError):
                rw.word(*args)

    def test_line(self):
        rw, _ = make()
        self.assertEqual((rw.line("L1"), rw.line_end("L1")), (1.0, 3.0))

    def test_snap(self):
        rw, _ = make(t0=1.0, fps=60)
        self.assertAlmostEqual(rw.snap(1.0 + 10.4 / 60), 1.0 + 10 / 60)
        self.assertAlmostEqual(rw.snap(1.0 + 10.5 / 60), 1.0 + 11 / 60)
        rw2, _ = make(t0=0.005, fps=30)
        self.assertAlmostEqual(rw2.snap(0.02), 0.005)

    def test_beat_grid_list_and_missing(self):
        rw, _ = make()
        self.assertEqual(rw.beat(4), 2.25)
        self.assertEqual(rw.bar(1), 2.25)
        kit = dict(KIT, MUSIC={"beats": [0.1, 0.62, 1.1]})
        self.assertEqual(make(kit=kit)[0].beat(1), 0.62)
        with self.assertRaises(ValueError):
            make(kit=dict(KIT, MUSIC={}))[0].beat(0)

    def test_theme(self):
        rw, _ = make()
        self.assertEqual(rw.color("accent"), "#ff0000")
        self.assertEqual((rw.font("text"), rw.font("display")), ("Inter", "Fraunces"))
        with self.assertRaises(KeyError):
            rw.color("nope")


class Marks(unittest.TestCase):
    def test_marks_and_state_file(self):
        fd, path = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        try:
            rw, _ = make(state=path)
            rw.at(1.5)
            self.assertEqual(rw.mark("pop"), 1.5)
            rw.label_illustrative()
            rw.finish()
            with open(path) as f:
                st = json.load(f)
            self.assertEqual(st, {"frames": 120, "marks": {"pop": 1.5}, "illustrative": True})
        finally:
            os.unlink(path)


if __name__ == "__main__":
    unittest.main()
