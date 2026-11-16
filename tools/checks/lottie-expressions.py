# lottie-expressions (gate): a Lottie expression that is not a pure function of time. lottie-web evaluates wiggle(), random(),
# seedRandom() and gaussRandom() with Math.random-backed values, so the same frame differs between page loads and revisits
# (measured: tools/selfcheck/p6-lottie-lint.mjs). Time-driven expressions (time, Math.sin, value) are deterministic and
# pass. The warning for any expression at all is lottie-expressions-info. Skip: "qa": {"lottie-expressions": false}.
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from lottie_scan import scan, NONDET

KIND = "gate"


def check(ctx):
    return [f"{f}: expression uses {m.group(0).strip('( ')} (Math.random-backed: frames differ between runs; derive it from time or a seeded value)"
            for f, e in scan(ctx["proj"]) for m in [NONDET.search(e)] if m]
