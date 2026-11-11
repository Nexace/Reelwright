"""Hello: the doctor's probe and the Node demo. Works under CE or GL and for any dur.

Writes a title on the first spoken word of the first VO line, then an equation (Typst on CE when
`manim[typst]` is installed, plain text otherwise). Every time comes from rw.*: no typed seconds.
"""
from reelwright_manim.names import *  # noqa: F401,F403


class Hello(RWScene):  # noqa: F405
    def construct(self):
        rw = self.rw
        end = rw.t0 + rw.dur
        lines = [k for k, v in (rw.kit.get("VO") or {}).items() if v.get("words")]
        cue = rw.word(lines[0], rw.kit["VO"][lines[0]]["words"][0]["w"]) if lines else rw.t0
        cue = min(max(cue, rw.now), rw.t0 + 0.2 * rw.dur)  # keep the demo inside any clip

        title = Text("Reelwright x Manim", font=rw.font("display"), color=rw.color("ink"))  # noqa: F405
        cam = self.camera  # CE Camera has frame_width; GL Camera has a CameraFrame
        fw = cam.frame_width if hasattr(cam, "frame_width") else cam.frame.get_width()
        if title.get_width() > 0.8 * fw:
            title.scale(0.8 * fw / title.get_width())
        title.shift(UP)  # noqa: F405
        rw.over(cue, cue + 0.4 * rw.dur, Write(title))  # noqa: F405
        rw.mark("title")

        try:
            eq = MathTypst("e^(i pi) + 1 = 0", color=rw.color("accent"))  # noqa: F405
            rw.mark("typst")
        except Exception:
            eq = Text("e^(i pi) + 1 = 0", font=rw.font("text"), color=rw.color("accent"))  # noqa: F405
        eq.next_to(title, DOWN)  # noqa: F405
        rw.over(rw.now, min(rw.now + 0.3 * rw.dur, end), FadeIn(eq))  # noqa: F405
        rw.mark("equation")
