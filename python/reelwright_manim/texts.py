"""texts.json export for the layout lint (OFF-FRAME / TEXT-OVERLAP / TINY-TEXT). No Manim import: it reads mobjects by duck typing.

A scene opts in (like rw.label_illustrative()) by taking snapshots of the text on screen at the moments that matter and writing
the file once at the end:

    from reelwright_manim import texts
    ...
    texts.snapshot(self, self.rw, "title")      # after the title has landed
    ...
    texts.snapshot(self, self.rw, "formula")
    texts.write(self.rw)                        # at the end of construct(); texts.json goes next to marks.json

Each snapshot lists every Text / MarkupText / Tex / MathTex / Paragraph / Code / number mobject that is visible (opacity > 0) with its
box in output pixels (x, y = top-left, y down) and its estimated font size in pixels. `reelwright manim-lint <project>` (tools/checks/
manim-lint.mjs) reads the file. Font size: Manim's `font_size` is a point size where 100 = one scene unit, so
size_px = font_size / 100 * (output px per scene unit); a text without `font_size` falls back to 0.8 of its line height. UNVERIFIED
against a live Manim install (none on the authoring machine): the tests use stand-in mobjects with the same methods.
"""
import json
import os

TEXT_CLASSES = {"Text", "MarkupText", "Tex", "MathTex", "Paragraph", "Title", "Code", "MathTypst", "Typst", "DecimalNumber", "Integer",
                "Variable", "BulletedList", "Paragraph", "SingleStringMathTex", "TexText", "StrokeText"}
_FILE = "texts.json"


def _frame(scene):
    """(frame_width, frame_height, centre_x, centre_y) in scene units for CE (camera.frame_width) and GL (camera.frame)."""
    cam = scene.camera
    if hasattr(cam, "frame_width"):
        c = getattr(cam, "frame_center", (0.0, 0.0, 0.0))
        return float(cam.frame_width), float(cam.frame_height), float(c[0]), float(c[1])
    f = cam.frame
    c = f.get_center()
    return float(f.get_width()), float(f.get_height()), float(c[0]), float(c[1])


def _walk(m, out):
    if type(m).__name__ in TEXT_CLASSES:
        out.append(m)  # a text's glyphs are its submobjects: do not descend
        return
    for s in getattr(m, "submobjects", None) or []:
        _walk(s, out)


def _visible(m):
    for name in ("get_fill_opacity", "get_stroke_opacity"):
        f = getattr(m, name, None)
        if f is not None:
            try:
                if float(f()) > 0.001:
                    return True
            except TypeError:
                pass
    return not (hasattr(m, "get_fill_opacity") or hasattr(m, "get_stroke_opacity"))


def collect(scene, px_w, px_h):
    """The visible text mobjects of `scene` as dicts in output pixels."""
    fw, fh, cx, cy = _frame(scene)
    ppu = px_w / fw  # output pixels per scene unit
    found = []
    for m in getattr(scene, "mobjects", None) or []:
        _walk(m, found)
    rows = []
    for m in found:
        if not _visible(m):
            continue
        left, right, top, bottom = float(m.get_left()[0]), float(m.get_right()[0]), float(m.get_top()[1]), float(m.get_bottom()[1])
        w, h = (right - left) * ppu, (top - bottom) * ppu
        if w <= 0 or h <= 0:
            continue
        fs = getattr(m, "font_size", None)
        size = float(fs) / 100.0 * ppu if fs else 0.8 * h
        rows.append({
            "text": str(getattr(m, "text", None) or getattr(m, "tex_string", None) or type(m).__name__),
            "kind": type(m).__name__,
            "x": round((left - (cx - fw / 2)) * ppu, 2),
            "y": round(((cy + fh / 2) - top) * ppu, 2),
            "w": round(w, 2), "h": round(h, 2), "size_px": round(size, 2),
        })
    return rows


def snapshot(scene, rw, label=None):
    """Record the text on screen now, stamped with the film time of the scene cursor."""
    snaps = getattr(rw, "_text_snaps", None)
    if snaps is None:
        snaps = rw._text_snaps = []
    snaps.append({"t": round(rw.now, 6), "label": label, "texts": collect(scene, int(rw.run["width"]), int(rw.run["height"]))})
    return snaps[-1]


def write(rw, path=None):
    """Write texts.json next to marks.json (the directory of the run's state file) or at `path`."""
    out = path or os.path.join(os.path.dirname(rw.run.get("state") or "."), _FILE)
    doc = {"version": 1, "width": int(rw.run["width"]), "height": int(rw.run["height"]), "fps": rw.fps, "t0": rw.t0, "dur": rw.dur,
           "snapshots": getattr(rw, "_text_snaps", None) or []}
    with open(out, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1)
    return out
