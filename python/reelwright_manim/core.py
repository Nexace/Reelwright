"""Engine-neutral core of reelwright_manim: kit.json, the frame quantiser and the `rw` clock. No Manim import.

Timing contract
- Film times are seconds on Reelwright's film clock (from kit.json, i.e. sched). Scene t=0 = film time t0.
- Clip frame i shows film time t0 + i/fps. The clip is exactly round(dur*fps) frames (round = JS Math.round).
- Manim CE and ManimGL both write ceil(run_time*fps) frames per play()/wait() (len of
  np.arange(0, run_time, 1/fps)). So n frames are asked for with run_time = (n - 0.5)/fps, which lands
  exactly on n for any fps and survives float error either side.
- The cursor (`rw.now`) is read back from the engine's own frame count after every play/wait, so author
  calls to self.play(run_time=...) outside `rw` stay in sync too.
- rw.finish() (called automatically in tear_down) pads to dur and asserts the frame count; running past
  dur is an error.

Licences: own code. Manim CE / ManimGL (MIT) are imported only by ce.py / gl.py, never vendored.
"""
import json
import math
import os
import re

ENV = "RW_MANIM"  # JSON run settings, set by `python -m reelwright_manim render`


def js_round(x):
    """Math.round semantics (half up), so frame counts agree with the Node side."""
    return int(math.floor(x + 0.5))


def frames_for(run_time, fps):
    """Frames an engine writes for one play/wait: len(np.arange(0, run_time, 1/fps)) == ceil(rt / step)."""
    return max(0, math.ceil(run_time / (1.0 / fps)))


def run_time_for(n, fps):
    """run_time that makes the engine write exactly n frames (n >= 1)."""
    if n < 1:
        raise ValueError("run_time_for: need at least 1 frame, got %r" % n)
    return (n - 0.5) / fps


def load_kit(path):
    with open(path, encoding="utf-8") as f:
        kit = json.load(f)
    for k in ("fps", "width", "height"):
        if k not in kit:
            raise ValueError("kit.json %s: missing %r" % (path, k))
    kit.setdefault("VO", {})
    kit.setdefault("MUSIC", {})
    kit.setdefault("theme", {})
    kit.setdefault("fonts", [])
    return kit


def _norm(w):
    return re.sub(r"\W+", "", str(w).lower())


class RW(object):
    """The `self.rw` API. Hooks: play(*anims, run_time=, **kw), wait(run_time), frames() -> frames written."""

    def __init__(self, kit, t0, dur, fps, play=None, wait=None, frames=None, state=None, run=None):
        self.kit = kit
        self.t0 = float(t0)
        self.dur = float(dur)
        self.fps = float(fps)
        self.total = js_round(self.dur * self.fps)
        if self.total < 1:
            raise ValueError("dur %r at %r fps is less than one frame" % (dur, fps))
        self.marks = {}
        self.illustrative = False
        self.run = run or {}
        self._play, self._wait = play, wait
        self._frames = frames or (lambda: 0)
        self._state = state
        self._finished = False

    # --- clock ---
    @property
    def frames(self):
        return self._frames()

    @property
    def now(self):
        """Film time of the scene cursor (the next frame to be written)."""
        return self.t0 + self.frames / self.fps

    def frame_of(self, t):
        """Clip frame index that shows film time t."""
        return js_round((float(t) - self.t0) * self.fps)

    def snap(self, t):
        """Film time t on the clip's frame grid."""
        return self.t0 + self.frame_of(t) / self.fps

    def until(self, t):
        """run_time that advances the cursor from now to film time t (0.0 when already there)."""
        target = self.frame_of(t)
        if target > self.total:
            raise ValueError("rw.until(%.3f): past the clip end %.3f (t0 %.3f + dur %.3f)"
                             % (t, self.t0 + self.dur, self.t0, self.dur))
        n = target - self.frames
        if n < -1:
            raise ValueError("rw.until(%.3f): %d frames in the past (now %.3f)" % (t, -n, self.now))
        return run_time_for(n, self.fps) if n >= 1 else 0.0

    def at(self, t):
        """Hold (a dense wait) until film time t."""
        rt = self.until(t)
        if rt:
            self._wait(rt)
        return self.now

    def over(self, t0, t1, *anims, **kw):
        """Wait until t0, then play anims so they end at film time t1."""
        self.at(t0)
        rt = self.until(t1)
        if not rt:
            raise ValueError("rw.over(%.3f, %.3f): spans less than one frame after now %.3f" % (t0, t1, self.now))
        self._play(*anims, run_time=rt, **kw)
        return self.now

    # --- film data ---
    def _line(self, line):
        vo = self.kit.get("VO") or {}
        if line not in vo:
            raise KeyError("no VO line %r (have: %s)" % (line, ", ".join(sorted(vo)) or "none"))
        return vo[line]

    def line(self, line):
        return float(self._line(line)["start"])

    def line_end(self, line):
        return float(self._line(line)["end"])

    def word(self, line, word, nth=1):
        """Film time of the nth (1-based) occurrence of word in VO line (case and punctuation ignored)."""
        words = self._line(line).get("words") or []
        key = _norm(word)
        hits = [w for w in words if _norm(w.get("w")) == key]
        if nth < 1 or len(hits) < nth:
            raise KeyError("word %r #%d not in line %r (%d found; words: %s)"
                           % (word, nth, line, len(hits), " ".join(str(w.get("w")) for w in words)))
        return float(hits[nth - 1]["t"])

    def beat(self, k):
        """Film time of beat k: MUSIC.beats[k] if sched gave a list, else t0 + k*beat."""
        m = self.kit.get("MUSIC") or {}
        if m.get("beats"):
            return float(m["beats"][k])
        if m.get("beat"):
            return float(m.get("t0", 0)) + k * float(m["beat"])
        raise ValueError("rw.beat: kit.json has no beat grid (MUSIC is %r)" % (m,))

    def bar(self, k):
        m = self.kit.get("MUSIC") or {}
        if not m.get("bar"):
            raise ValueError("rw.bar: kit.json has no bar length (MUSIC is %r)" % (m,))
        return float(m.get("t0", 0)) + k * float(m["bar"])

    def color(self, name):
        theme = self.kit.get("theme") or {}
        if name not in theme:
            raise KeyError("no theme colour %r (have: %s)" % (name, ", ".join(sorted(theme))))
        return theme[name]

    def font(self, kind="text"):
        """Theme font family: kind 'text' or 'display'."""
        key = {"text": "fontText", "display": "fontDisplay"}.get(kind, kind)
        theme = self.kit.get("theme") or {}
        if not theme.get(key):
            raise KeyError("no theme font %r" % kind)
        return theme[key]

    # --- output ---
    def mark(self, name):
        """Record the current film time under name (exported in marks.json for KIT.manim().markAt)."""
        self.marks[name] = round(self.now, 6)
        return self.marks[name]

    def label_illustrative(self):
        """The scene shows made-up numbers: the film must show an 'Illustrative data' label."""
        self.illustrative = True

    def finish(self):
        """Pad to dur, assert the frame count, write the state file. Idempotent."""
        if self._finished:
            return
        n = self.total - self.frames
        if n < 0:
            raise RuntimeError("scene ran past dur by %d frames (%d > %d)" % (-n, self.frames, self.total))
        if n:
            self._wait(run_time_for(n, self.fps))
        if self.frames != self.total:
            raise RuntimeError("frame count %d != round(dur*fps) %d" % (self.frames, self.total))
        if self._state:
            with open(self._state, "w", encoding="utf-8") as f:
                json.dump({"frames": self.frames, "marks": self.marks, "illustrative": self.illustrative}, f)
        self._finished = True


def from_env(**hooks):
    """Build the scene's RW from the settings `render` put in $RW_MANIM."""
    raw = os.environ.get(ENV)
    if not raw:
        raise RuntimeError("%s is not set: render scenes with `python -m reelwright_manim render ...`" % ENV)
    run = json.loads(raw)
    return RW(load_kit(run["kit"]), run["t0"], run["dur"], run["fps"], state=run.get("state"), run=run, **hooks)
