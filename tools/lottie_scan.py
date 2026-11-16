# Shared by tools/checks/lottie-expressions.py (gate) and lottie-expressions-info.py (warn); not a check itself.
# scan(proj) -> [(relative file, expression string)]: every After Effects expression a film's Lottie files carry. Lottie JSON
# files (a dict with "layers" and "fr") are walked for any property {"k": ..., "x": "<code>"}; film scripts and pages are
# searched for string literals holding compiled expressions ("$bm_rt", what bodymovin emits).
import json, os, re

SKIP = {"frames", "out", "stills", ".cache", "node_modules", "kit", "rm", "vendor"}
STR = re.compile(r"""(["'`])((?:(?!\1)[^\\]|\\.)*\$bm_rt(?:(?!\1)[^\\]|\\.)*)\1""")


def _walk(o, hits):
    if isinstance(o, dict):
        if isinstance(o.get("x"), str) and "k" in o: hits.append(o["x"])
        for v in o.values(): _walk(v, hits)
    elif isinstance(o, list):
        for v in o: _walk(v, hits)


def scan(proj):
    out = []
    for d, dirs, files in os.walk(proj):
        dirs[:] = [x for x in dirs if x not in SKIP and not x.startswith("frames-") and not x.startswith("stills-")]
        for f in files:
            fp = os.path.join(d, f); rel = os.path.relpath(fp, proj)
            try:
                if os.path.getsize(fp) > 8_000_000: continue
                if f.endswith(".json"):
                    j = json.load(open(fp, encoding="utf-8"))
                    if isinstance(j, dict) and isinstance(j.get("layers"), list) and "fr" in j:
                        hits = []; _walk(j, hits); out += [(rel, h) for h in hits]
                elif f.endswith((".js", ".html")):
                    src = open(fp, encoding="utf-8").read()
                    if "$bm_rt" in src: out += [(rel, m.group(2)) for m in STR.finditer(src)]
            except (OSError, ValueError, UnicodeDecodeError): pass
    return out


# expressions lottie-web evaluates with Math.random-backed values: two page loads (and a revisit of the same frame) give
# different frames (tools/selfcheck/p6-lottie-lint.mjs measures this). time-driven expressions are deterministic.
NONDET = re.compile(r"\b(wiggle|random|seedRandom|gaussRandom)\s*\(|Math\.random|Date\.now|new\s+Date|performance\.now")
