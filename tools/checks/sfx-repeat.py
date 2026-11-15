# sfx-repeat (WARN, opt-in): rule S2, a repeated SFX alternates pitch and steps down. tools/mix.py does both for the kinds in its NEW table
# (same-kind cues within 0.5 s go 0, +1, -1 semitone and x0.8 each); an older kind (click, tap, pop, whoosh, ...) repeated within
# 0.6 s plays the identical sample at the same level, which reads as a machine gun. Off unless project.json has
# "qa": {"sfx-repeat": true}. Fix: use the matching new kind (tick for click, bubble for pop, ...) or alternate two kinds.
import json, os, re

KIND = "warn"
GAP = 0.6


def new_kinds():
    src = open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mix.py"), encoding="utf-8").read()
    block = src[src.index("NEW = {"):src.index("LIB = {")]
    return set(re.findall(r'"(\w+)":', block))


def check(ctx):
    if (ctx["P"].get("qa") or {}).get("sfx-repeat") is not True: return []
    tl = os.path.join(ctx["proj"], "timeline.json")
    if not os.path.exists(tl): return []
    auto, out, run = new_kinds(), [], []
    cues = sorted(json.load(open(tl)).get("cues", []), key=lambda c: c["t"])
    for c in cues + [None]:
        if run and (c is None or c["kind"] != run[-1]["kind"] or c["t"] - run[-1]["t"] > GAP):
            if len(run) > 1 and run[0]["kind"] not in auto:
                out.append(f"S2 {len(run)} x '{run[0]['kind']}' within {run[-1]['t'] - run[0]['t']:.2f}s from {run[0]['t']:.2f}s: an old kind repeats the same sample at the same level (no pitch alternation, no step down)")
            run = []
        if c is not None: run.append(c)
    return out
