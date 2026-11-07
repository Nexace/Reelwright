# seekable-runtimes (gate): the film's own code uses the animation runtimes (tools/runtimes.js) only in ways that seek.
# Bans the library paths that call Math.random on every render or failed a shuffled-seek test, and real-time playback:
# GSAP ScrambleText, stagger/anime from:"random", RoughEase, CustomWiggle type:"random", gsap/anime utils.random/shuffle,
# MotionPath (use KIT.path), play()/repeat:-1/ticker/ScrollTrigger, global gsap.to/from/fromTo (the real-time ticker),
# autoplay:true (lottie, anime), GSAP "random(…)" values, direct lottie.loadAnimation, timelines outside KIT.gsap, Three clocks. Same files as the built-in seekable gate (qa.py). docs/playbook/runtimes.md has the why.
import os, re

KIND = "gate"
BAD = [
    (r"ScrambleText|scrambleText\s*:", "GSAP ScrambleText calls Math.random on every render (no seeded option)"),
    (r"""\bfrom\s*:\s*['"]random['"]""", 'stagger from:"random" is Math.random (use "center", "edges", an index or a seeded order)'),
    (r"RoughEase|\brough\(", "RoughEase is Math.random (use CustomWiggle easeOut/uniform/anticipate)"),
    (r"""\btype\s*:\s*['"]random['"]""", 'CustomWiggle type:"random" is Math.random (use easeOut, easeInOut, uniform, anticipate)'),
    (r"\butils\.(random|shuffle)\s*\(", "utils.random / utils.shuffle are Math.random (use a seeded function, e.g. KIT.doodle.hash)"),
    (r"MotionPath|motionPath\s*:", "GSAP MotionPath failed the shuffled-seek test (use KIT.path)"),
    (r"\.play\s*\(|\brepeat\s*:\s*-1\b|\bgsap\.ticker\.add\b|ScrollTrigger|\bDraggable\b|\bObserver\b",
     "plays in real time (seek from render(t) instead)"),
    (r"\bgsap\.(to|from|fromTo)\s*\(", "a global tween runs on GSAP's real-time ticker (add it to the KIT.gsap timeline)"),
    (r"\bautoplay\s*:\s*true\b", "autoplay plays in real time (KIT.lottie / KIT.anime keep it off)"),
    (r"""['"]random\(""", 'a GSAP "random(…)" value is Math.random at build: pages differ (use a seeded value)'),
    (r"\bloadAnimation\s*\(", "lottie.loadAnimation autoplays by default (use KIT.lottie)"),
    (r"\bgsap\.(timeline|delayedCall)\s*\(", "a GSAP timeline outside KIT.gsap runs in real time (use the tl KIT.gsap passes to build)"),
    (r"\bClock\s*\(|getElapsedTime|setAnimationLoop", "Three.js real-time clock or loop (animate in update(t))"),
]


def check(ctx):
    proj, P = ctx["proj"], ctx["P"]
    if P.get("renderer") == "hyperframes":
        src = ["hf/film.js", "hf/index.html"]
        b = os.path.join(proj, "hf/blocks")
        if os.path.isdir(b): src += ["hf/blocks/" + f for f in sorted(os.listdir(b))]
    else:
        d = os.path.join(proj, "film")
        src = ["film/" + f for f in sorted(os.listdir(d)) if f.endswith((".js", ".html")) and f not in ("data.js", "clip.js")]
    hits = []
    for f in src:
        fp = os.path.join(proj, f)
        if not os.path.isfile(fp): continue
        for n, line in enumerate(open(fp, encoding="utf-8"), 1):
            if line.lstrip().startswith("//"): continue
            hits += [f"{f}:{n}: {why}" for rx, why in BAD if re.search(rx, line)]
    return hits
