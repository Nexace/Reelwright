"""A Manim CE scene timed by the VO script (rw.*): a curve grows on the spoken word "curve", a Typst equation writes on "equation"."""
from reelwright_manim.names import *


class Proof(RWScene):
    def construct(self):
        rw = self.rw
        ax = Axes(x_range=[0, 6, 1], y_range=[-1.5, 1.5, 1], x_length=7, y_length=3,
                  axis_config={"color": rw.color("muted")}).shift(DOWN * 0.8)
        curve = ax.plot(lambda x: np.sin(x) * np.exp(-x / 5), color=rw.color("accent"), stroke_width=6)
        eq = MathTypst("f(x) = sin(x) e^(-x slash 5)", color=rw.color("ink")).scale(0.9).to_edge(UP)
        rw.over(rw.now, rw.word("write", "curve"), Create(ax))
        rw.over(rw.word("write", "curve"), rw.word("write", "equation"), Create(curve))
        rw.mark("curve")
        rw.over(rw.word("write", "equation"), rw.line_end("write"), Write(eq))
        rw.mark("equation")
