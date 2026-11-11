"""CLI: python -m reelwright_manim render | doctor | selftest.

render --kit K --file scene.py --class Name --engine ce|gl --t0 S --dur S --fps N --size WxH --alpha 0|1
       --out DIR [--seed 0]
  Runs the scene in a subprocess (CE: `python -m reelwright_manim _ce`, GL: `python -m manimlib ... -w`)
  into a fresh media dir, moves the clip to DIR/scene.mov, counts its frames with ffprobe -count_frames,
  and writes DIR/marks.json = {frames, fps, t0, marks, illustrative}. Fails (exit 1, one-line message) if
  the scene ran past dur, the frame count != round(dur*fps), the size is wrong, or alpha was asked and the
  clip has none.
doctor --engine ce|gl
  Prints one JSON line {ok, python, engine, manim, typst, alpha, frames, problems} after a 1 s probe render
  (examples/hello.py). Never crashes when Manim is missing.
selftest
  Engine-neutral unit tests (no Manim needed).

Licences: Manim CE / ManimGL are MIT, installed by the user into their own venv, never vendored.
"""
import argparse
import importlib.util
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from .core import ENV, js_round, load_kit

PKG_PARENT = Path(__file__).resolve().parent.parent
HELLO = Path(__file__).resolve().parent / "examples" / "hello.py"
ALPHA_FMTS = ("argb", "rgba", "bgra", "abgr", "yuva", "gbrap", "ya8", "ya16")


class Fail(Exception):
    pass


def has_alpha(pix_fmt):
    return bool(pix_fmt) and pix_fmt.startswith(ALPHA_FMTS)


def probe(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                        "stream=nb_read_frames,width,height,pix_fmt", "-of", "json", str(path)],
                       capture_output=True, text=True)
    if p.returncode:
        raise Fail("ffprobe failed on %s: %s" % (path, p.stderr.strip()))
    s = json.loads(p.stdout)["streams"][0]
    return int(s["nb_read_frames"]), int(s["width"]), int(s["height"]), s.get("pix_fmt", "")


def render(a, quiet=False):
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            raise Fail("%s not on PATH" % tool)
    m = re.fullmatch(r"(\d+)x(\d+)", a.size)
    if not m:
        raise Fail("--size must be WxH, got %r" % a.size)
    w, h = int(m.group(1)), int(m.group(2))
    if a.dur <= 0 or a.fps <= 0 or not w or not h:
        raise Fail("--dur, --fps and --size must be positive")
    kit_path, file = Path(a.kit).resolve(), Path(a.file).resolve()
    kit = load_kit(str(kit_path))
    if not file.is_file():
        raise Fail("scene file not found: %s" % file)
    total = js_round(a.dur * a.fps)
    out = Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    state, clip, marks_path = out / ".rw-state.json", out / "scene.mov", out / "marks.json"
    for stale in (state, clip, marks_path):
        if stale.exists():
            stale.unlink()
    for old in out.glob(".media-*"):  # a failed run keeps its media dir for debugging until the next run
        shutil.rmtree(str(old), ignore_errors=True)
    media =Path(tempfile.mkdtemp(prefix=".media-", dir=str(out)))  # fresh: no stale partial movies

    run = {"engine": a.engine, "kit": str(kit_path), "t0": a.t0, "dur": a.dur, "fps": a.fps, "width": w,
           "height": h, "alpha": bool(a.alpha), "seed": a.seed, "state": str(state),
           "bg": (kit.get("theme") or {}).get("bg")}
    env = dict(os.environ)
    env[ENV] = json.dumps(run)
    env["PYTHONHASHSEED"] = "0"
    env["PYTHONPATH"] = os.pathsep.join(x for x in (str(PKG_PARENT), str(file.parent), env.get("PYTHONPATH")) if x)
    if a.engine == "ce":
        cmd = [sys.executable, "-m", "reelwright_manim", "_ce", str(file), a.cls, str(media)]
    else:
        cmd = [sys.executable, "-m", "manimlib", str(file), a.cls, "-w", "-r", "%dx%d" % (w, h),
               "--fps", "%g" % a.fps, "--video_dir", str(media), "--file_name", "scene"]
        cmd += ["-t"] if a.alpha else (["-c", run["bg"]] if run["bg"] else [])
    io = {"capture_output": True, "text": True} if quiet else {"stdout": sys.stderr}
    p = subprocess.run(cmd, env=env, cwd=str(media), **io)
    if p.returncode:
        tail = ((p.stderr or "") + (p.stdout or "")).strip()[-1500:] if quiet else ""
        raise Fail("%s render failed (exit %d)%s" % (a.engine, p.returncode, (": " + tail) if tail else ""))
    if not state.exists():
        raise Fail("scene never reached rw.finish(): is %s a subclass of RWScene (CE) / RWSceneGL (GL)?" % a.cls)
    st = json.loads(state.read_text(encoding="utf-8"))

    found = sorted(x for x in media.rglob("scene.*")
                   if x.suffix in (".mov", ".mp4") and "partial_movie_files" not in x.parts)
    if not found:
        raise Fail("no rendered clip under %s" % media)
    if found[0].suffix == ".mov":
        shutil.move(str(found[0]), str(clip))
    else:  # opaque GL writes .mp4: remux, no re-encode
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(found[0]), "-c", "copy", "-an", str(clip)],
                           capture_output=True, text=True)
        if r.returncode:
            raise Fail("ffmpeg remux failed: %s" % r.stderr.strip())

    try:
        frames, pw, ph, pix = probe(clip)
        if frames != total:
            raise Fail("clip has %d frames, expected round(dur*fps) = %d (scene counted %s)"
                       % (frames, total, st.get("frames")))
        if (pw, ph) != (w, h):
            raise Fail("clip is %dx%d, expected %dx%d" % (pw, ph, w, h))
        if a.alpha and not has_alpha(pix):
            raise Fail("alpha requested but the clip pix_fmt is %s" % pix)
    except Fail:
        clip.unlink()  # never leave a wrong clip where the cache would pick it up
        raise
    fps = int(a.fps) if float(a.fps).is_integer() else a.fps
    marks = {"frames": frames, "fps": fps, "t0": a.t0, "marks": st.get("marks", {}),
             "illustrative": bool(st.get("illustrative"))}
    marks_path.write_text(json.dumps(marks, indent=1), encoding="utf-8")
    shutil.rmtree(str(media), ignore_errors=True)
    state.unlink()
    return marks, pix


def doctor(engine):
    res = {"ok": False, "python": platform.python_version(), "engine": engine, "manim": None, "typst": False,
           "alpha": False, "frames": False, "problems": []}
    P = res["problems"]
    mod, dist, need = ("manim", "manim", (3, 11)) if engine == "ce" else ("manimlib", "manimgl", (3, 10))
    if importlib.util.find_spec(mod) is None:
        P.append("manim not installed")
    else:
        try:
            from importlib.metadata import version
            res["manim"] = version(dist)
        except Exception:
            res["manim"] = "unknown"
    if sys.version_info[:2] < need:
        P.append("python %s is too old (%s needs >= %d.%d)" % (res["python"], dist, need[0], need[1]))
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            P.append("%s not on PATH" % tool)
    typst = engine == "ce" and importlib.util.find_spec("typst") is not None
    if not P:
        with tempfile.TemporaryDirectory(prefix="rw-manim-doctor-") as d:
            kit = {"fps": 30, "width": 320, "height": 180, "dur": 1, "MUSIC": {}, "fonts": [],
                   "VO": {"L1": {"start": 0.1, "end": 0.9, "words": [{"w": "Hello", "t": 0.1, "d": 0.3},
                                                                     {"w": "world", "t": 0.5, "d": 0.3}]}},
                   "theme": {"bg": "#ffffff", "ink": "#111111", "accent": "#3355ff", "accent2": "#ff5533",
                             "muted": "#888888", "fontText": "Sans", "fontDisplay": "Sans"}}
            kp = Path(d) / "kit.json"
            kp.write_text(json.dumps(kit), encoding="utf-8")
            a = argparse.Namespace(kit=str(kp), file=str(HELLO), cls="Hello", engine=engine, t0=0.0, dur=1.0,
                                   fps=30.0, size="320x180", alpha=1, out=str(Path(d) / "out"), seed=0)
            try:
                marks, pix = render(a, quiet=True)
                res["frames"] = marks["frames"] == 30
                res["alpha"] = has_alpha(pix)
                res["typst"] = typst and "typst" in marks["marks"]
                if typst and not res["typst"]:
                    P.append("typst is importable but the MathTypst probe fell back to Text")
            except Fail as e:
                P.append(str(e))
            except Exception as e:
                P.append("%s: %s" % (type(e).__name__, e))
    res["ok"] = not P
    print(json.dumps(res))
    return 0 if res["ok"] else 1


def selftest():
    import unittest
    from .tests import test_core
    r = unittest.TextTestRunner(verbosity=1).run(unittest.defaultTestLoader.loadTestsFromModule(test_core))
    return 0 if r.wasSuccessful() else 1


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m reelwright_manim")
    sub = ap.add_subparsers(dest="cmd")
    r = sub.add_parser("render", help="render one scene to DIR/scene.mov + DIR/marks.json")
    r.add_argument("--kit", required=True)
    r.add_argument("--file", required=True)
    r.add_argument("--class", dest="cls", required=True)
    r.add_argument("--engine", choices=("ce", "gl"), default="ce")
    r.add_argument("--t0", type=float, required=True)
    r.add_argument("--dur", type=float, required=True)
    r.add_argument("--fps", type=float, required=True)
    r.add_argument("--size", required=True)
    r.add_argument("--alpha", type=int, choices=(0, 1), default=1)
    r.add_argument("--out", required=True)
    r.add_argument("--seed", type=int, default=0)
    d = sub.add_parser("doctor", help="probe render; prints one JSON line")
    d.add_argument("--engine", choices=("ce", "gl"), default="ce")
    sub.add_parser("selftest", help="engine-neutral unit tests")
    c = sub.add_parser("_ce")  # internal: the CE render subprocess
    c.add_argument("file")
    c.add_argument("cls")
    c.add_argument("media")
    a = ap.parse_args(argv)

    if a.cmd == "doctor":
        return doctor(a.engine)
    if a.cmd == "selftest":
        return selftest()
    if a.cmd == "_ce":
        from .ce import render_child
        render_child(a.file, a.cls, a.media)
        return 0
    if a.cmd == "render":
        try:
            render(a)
        except (Fail, ValueError, KeyError, OSError) as e:
            sys.stderr.write("reelwright_manim: %s\n" % e)
            return 1
        return 0
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
