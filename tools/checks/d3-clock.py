# d3-clock (WARN): a film's own code uses d3 only as pure functions of t (scales, shapes, delaunay, interpolators), never its clock.
# d3.transition(), selection.transition(), d3.timer, d3.interval and d3.now run on the wall clock, so frames would differ from render to render
# (docs/playbook/d3.md). Same files as the seekable-runtimes gate, but not the converted catalog blocks (they have their own verify step).
import os, re

KIND = "warn"
BAD = [
    (r"\bd3\s*\.\s*(transition|timer|timerFlush|interval|now)\b", "d3 clock (d3.transition/timer/interval/now): compute the value from t with a scale instead"),
    (r"(?<!KIT)(?<!K)\.\s*transition\s*\(\s*\)|(?<!KIT)(?<!K)\.\s*transition\s*\(\s*['\"]?[\w.]*['\"]?\s*\)\s*\.\s*(duration|delay|ease)", "a d3 selection transition runs on the wall clock: set the attribute from t in render(t)"),
]


def check(ctx):
    proj, P = ctx["proj"], ctx["P"]
    if P.get("renderer") == "hyperframes": src = ["hf/film.js", "hf/index.html"]
    else:
        d = os.path.join(proj, "film")
        src = ["film/" + f for f in sorted(os.listdir(d)) if f.endswith((".js", ".html")) and f not in ("data.js", "clip.js")] if os.path.isdir(d) else []
    hits = []
    for f in src:
        fp = os.path.join(proj, f)
        if not os.path.isfile(fp): continue
        for n, line in enumerate(open(fp, encoding="utf-8"), 1):
            if line.lstrip().startswith("//"): continue
            hits += [f"{f}:{n}: {why}" for rx, why in BAD if re.search(rx, line)]
    return hits
