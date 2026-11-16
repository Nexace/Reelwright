# python3 tools/marks.py <project>
# Named time markers, derived from the VO word timings and stored OUTSIDE the film: <project>/marks.json.
# project.json "marks" names them:
#   "marks": { "cta": "cta", "price": { "line": "demo", "word": "forty", "nth": 1 } }
# a string is a VO line id (t = the line's start), an object names a word in it (t = that word's start, the same match
# KIT.W does, with the base-language fraction for --lang builds). Each entry is {line, [word, nth], t, dur}: dur runs to
# the end of its line, so "hold until the CTA is spoken" is KIT.until("cta", t) and KIT.dur("cta") is how long it runs.
# sched.py calls resolve() and bakes the times into window.MUSIC.marks for KIT.mark / KIT.until / KIT.dur
# (tools/hit-sync.js). This CLI regenerates marks.json from the transcript (film/data.js, written by sched) after a script
# edit. Names already in marks.json are kept when project.json no longer lists them (delete the file to drop them).
import json, os, re, sys

NORM = lambda s: re.sub(r"[^\w']|_", "", str(s).lower())


def specs(proj, P):
    out = {}
    mp = os.path.join(proj, "marks.json")
    if os.path.exists(mp):
        for name, m in json.load(open(mp)).items():
            if isinstance(m, dict) and m.get("line"): out[name] = {k: m[k] for k in ("line", "word", "nth") if m.get(k) is not None}
    for name, m in (P.get("marks") or {}).items():
        out[name] = {"line": m} if isinstance(m, str) else {k: m[k] for k in ("line", "word", "nth") if m.get(k) is not None}
    return out


def word_time(v, word, nth):
    n = 0
    for w in v["words"]:
        if NORM(w["w"]) == NORM(word):
            n += 1
            if n == nth: return w["t"]
    for b in v.get("base") or []:   # --lang: the translated line carries the base word's fraction of the line
        if NORM(b["w"]) == NORM(word):
            n += 1
            if n == nth: return v["start"] + b["f"] * (v["end"] - v["start"])
    return None


def resolve(proj, P, vo):
    """{name: {line, [word, nth], t, dur}} from the definitions and the placed VO; writes marks.json beside the film."""
    out = {}
    for name, s in specs(proj, P).items():
        lid, v = s.get("line"), vo.get(s.get("line"))
        if not v: sys.exit(f'marks: "{name}" names VO line "{lid}", which is not on the timeline')
        t = v["start"]
        if s.get("word"):
            nth = int(s.get("nth", 1))
            t = word_time(v, s["word"], nth)
            if t is None: sys.exit(f'marks: word "{s["word"]}" (#{nth}) not in VO line {lid}: {v["text"]}')
            s = {**s, "nth": nth}
        out[name] = {**s, "t": round(t, 3), "dur": round(v["end"] - t, 3)}
    if out: json.dump(out, open(os.path.join(proj, "marks.json"), "w"), indent=1)
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit("usage: python3 tools/marks.py <project>")
    proj = sys.argv[1]
    P = json.load(open(os.path.join(proj, "project.json")))
    data = os.path.join(proj, "hf/kit-data.js" if P.get("renderer") == "hyperframes" else "film/data.js")
    if not os.path.exists(data): sys.exit(f"no {data} — run reelwright sched first")
    m = re.search(r"^window\.VO=(.*);$", open(data).read(), re.M)
    if not m: sys.exit(f"{data} has no window.VO — run reelwright sched first")
    mk = resolve(proj, P, json.loads(m.group(1)))
    for name, v in mk.items(): print(f"{name:16} {v['t']:7.2f}  +{v['dur']:.2f}s  {v['line']}" + (f"/{v['word']}" if v.get("word") else ""))
    print(f"marks.json: {len(mk)} mark{'s' if len(mk) != 1 else ''}" + ("" if mk else ' — add project.json "marks"'))
