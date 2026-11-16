# lottie-expressions-info (warn): a Lottie file carries After Effects expressions. lottie-web evaluates them on every seek;
# time-driven ones are deterministic (tools/selfcheck/p6-lottie.mjs), but an expression can read layer state or other
# properties that were never tested here: look at stills around the animation. The non-deterministic ones (wiggle, random,
# seedRandom, gaussRandom) fail the lottie-expressions gate instead. Skip: "qa": {"lottie-expressions-info": false}.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lottie_scan import scan, NONDET

KIND = "warn"


def check(ctx):
    n = {}
    for f, e in scan(ctx["proj"]):
        if not NONDET.search(e): n[f] = n.get(f, 0) + 1
    return [f"{f}: {k} expression(s) evaluated at every seek (time-driven ones are deterministic; check the stills)" for f, k in n.items()]
