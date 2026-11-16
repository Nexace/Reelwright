# python3 tools/qa.py <project>
# Report: biggest frame-to-frame jumps (should sit on cuts / beats, not mid-shot) and blank or near-uniform
# frames (a missing image, a scene that faded to nothing). Then look at the times it prints.
# Gates, each PASS / FAIL with a time, frame or file; any FAIL exits 1. Skip one with project.json "qa": {"<gate>": false}.
#   loudness      the mp4's audio: integrated within ±1 LU of project.json loudness, true peak ≤ −1 dBTP
#   cambi         banding in the delivered mp4, per scene: the mean CAMBI score must stay under 6 (libvmaf; skipped
#                 when the local ffmpeg has no libvmaf, so the pipeline stays offline-safe)
#   vmaf          only when project.json "output": {"master": "<file>"} exists: the mp4's VMAF against that master,
#                 per scene, mean ≥ 93 (libvmaf; skipped the same way, and when there is no master)
#   captions      in the safe area, ≤ 2 lines, contrast ≥ 4.5 (tools/qa_page.mjs)
#   flash         ≤ 3 flashes in any 1 s, over the whole frame or any quarter (WCAG 2.3.1 general flash; red flash not checked)
#   illustrative  numbers on screen come with an "Illustrative data" label; numbers in a screenshot's data-qa-text
#                 pass with that label or a "Source: …" credit (tools/qa_page.mjs)
#   ai-label      WARN only: a `reelwright gen` image/video on screen with no KIT.aiLabel / "AI-generated" text (tools/qa_page.mjs)
#   seekable      the film's own code has no clock, randomness, timers or CSS transitions: render(t) must be a pure function of t
#   hero-ease     an element marked data-hero uses a generic easing keyword (ease, linear, ease-in-out) instead of an
#                 intent name (enter / exit / ambient / impact)
#   shot-shutter  KIT.shot.shutter(deg) is 0–360 and has motion blur to spread (project.json "motionBlur" or --blur)
# WARN lines, never failures, skippable the same way ("qa": {"overlap": false}): overlap, tiny-text, wordy (tools/qa_page.mjs),
# dark (stretches over 2 s of flat near-black frames with no VO playing), scale-zero (an entrance that starts at scale 0;
# start at 0.93 instead).
# Plug-in checks: tools/checks/<name>.py and tools/checks/<name>.page.mjs, each a gate or a WARN (see below).
# Then a variety line (WARN, never a failure) when another film in projects/ has the same theme or look (tools/look.mjs).
# `--lints-only` / `--quality-only` run just the source lints or the delivered-file gates (used by the self-checks; no frames needed).
import json, os, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageChops, ImageStat

proj = sys.argv[1]
ARGS = sys.argv[2:]
LINT_ONLY, QUALITY_ONLY = "--lints-only" in ARGS, "--quality-only" in ARGS   # test seams: the source lints or the delivered-file gate alone
FULL = not LINT_ONLY and not QUALITY_ONLY
NODE = os.environ.get("REELWRIGHT_NODE", "node")   # bin/reelwright.mjs passes the node it runs on, as it uses for every step
FFMPEG = os.environ.get("REELWRIGHT_FFMPEG", "ffmpeg")
P = json.load(open(os.path.join(proj, "project.json")))
fps = int(os.environ.get("FPS") or P.get("fps", 60))
D = os.path.join(proj, "frames")

# ── gates ─────────────────────────────────────────────────────────────────
Q = P.get("qa", {})
fails = 0
def gate(name, problems, ok_note=""):
    global fails
    if Q.get(name) is False:
        print(f"  SKIP  {name}  (project.json qa.{name} = false)"); return
    if problems:
        fails += 1
        print(f"  FAIL  {name}")
        for x in problems[:8]: print(f"          {x}")
        if len(problems) > 8: print(f"          … {len(problems) - 8} more")
    else:
        print(f"  PASS  {name}  {ok_note}")
def skip(name, why):
    print(f"  SKIP  {name}  (project.json qa.{name} = false)" if Q.get(name) is False else f"  SKIP  {name}  ({why})")
def warn(name, lines):
    if Q.get(name) is not False:
        for x in lines[:8]: print(f"  WARN  {name}: {x}")
        if len(lines) > 8: print(f"  WARN  {name}: … {len(lines) - 8} more")

files = sorted(f for f in os.listdir(D) if f.endswith((".jpg", ".png"))) if FULL else []   # pvk: f%05d.jpg, hyperframes: frame_%06d.png
prev, diffs, flat, lums = None, [], [], []
if FULL:
    for i, f in enumerate(files):
        rgb = Image.open(os.path.join(D, f)).convert("RGB")
        a = np.asarray(rgb.resize((64, 36)), np.float64) / 255   # relative luminance per pixel, for the flash gate
        a = np.where(a <= 0.03928, a / 12.92, ((a + 0.055) / 1.055) ** 2.4) @ [0.2126, 0.7152, 0.0722]
        lums.append([a.mean(), a[:18, :32].mean(), a[:18, 32:].mean(), a[18:, :32].mean(), a[18:, 32:].mean()])
        im = rgb.convert("L").resize((192, 108))
        st = ImageStat.Stat(im)
        if st.stddev[0] < 3:
            flat.append(i / fps)
        if prev is not None:
            diffs.append((ImageStat.Stat(ImageChops.difference(im, prev)).mean[0], i / fps))
        prev = im
    diffs.sort(reverse=True)
    print(f"{len(files)} frames ({len(files) / fps:.1f}s)")
    print("largest frame-to-frame changes (expect these on cuts/beats; anything else = a blip):")
    for d, t in diffs[:12]:
        print(f"  {t:7.2f}s  {d:6.2f}")
    if flat:
        runs, s = [], flat[0]
        for a, b in zip(flat, flat[1:] + [None]):
            if b is None or b - a > 1.5 / fps: runs.append((s, a)); s = b
        print("near-blank stretches:", ", ".join(f"{a:.2f}–{b:.2f}s" for a, b in runs))
    else:
        print("no blank frames")

# the delivered mp4, so the out name follows --lang / --style / --formats as in tools/render.mjs
suffix = "".join("-" + os.environ[k] for k in ("REELWRIGHT_LANG", "REELWRIGHT_STYLE", "REELWRIGHT_FORMAT") if os.environ.get(k))
mp4 = os.path.join(proj, re.sub(r"(\.mp4)?$", suffix + ".mp4", P.get("out", "out/film.mp4"), count=1))

if FULL:
    print("\ngates:")
    target = P.get("loudness", -14)
    if not os.path.exists(mp4):
        gate("loudness", [f"no {mp4} — run encode first"])
    else:
        r = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-i", mp4, "-af", "ebur128=peak=true", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
        summ = r[r.rfind("Summary:"):]
        I = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summ); TP = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summ)
        if not I:
            gate("loudness", [f"{mp4} has no audio"])
        else:
            i, tp = float(I.group(1)), float(TP.group(1)) if TP else -99
            gate("loudness", ([f"integrated {i:.1f} LUFS, target {target} ±1"] if abs(i - target) > 1 else []) +
                 ([f"true peak {tp:.1f} dBTP (max −1)"] if tp > -1 else []), f"({i:.1f} LUFS, peak {tp:.1f} dBTP)")

# ── quality: CAMBI (banding) on the mp4, VMAF against output.master; both skip when ffmpeg has no libvmaf ──
def libvmaf_frames(main, ref, feature=None):
    with tempfile.TemporaryDirectory() as td:   # relative log path: no filter-graph escaping, on any platform
        vf = "[0:v][1:v]libvmaf=log_path=vmaf.json:log_fmt=json" + (f":feature=name={feature}" if feature else "")
        r = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-v", "error", "-i", main, "-i", ref, "-lavfi", vf, "-f", "null", "-"],
                           capture_output=True, text=True, cwd=td)
        if r.returncode: raise RuntimeError(r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "ffmpeg failed")
        return json.load(open(os.path.join(td, "vmaf.json")))["frames"]

def scenes():
    dur = len(files) / fps if files else 0
    tl = os.path.join(proj, "timeline.json")
    if os.path.exists(tl):
        try:
            T = json.load(open(tl)); dur = float(T.get("DUR") or dur)
            vo = sorted(((float(v.get("start", v.get("at", 0))), k) for k, v in (T.get("VO") or {}).items()), key=lambda x: x[0])
            if vo:
                out = [("open", 0.0, vo[0][0])] if vo[0][0] > 0 else []
                out += [(str(k), s, vo[j + 1][0] if j + 1 < len(vo) else dur) for j, (s, k) in enumerate(vo)]
                return out
        except Exception:
            pass
    return [("film", 0.0, dur or float("inf"))]

def per_scene(frames, key):
    out = []
    for name, a, b in scenes():
        vals = [f["metrics"][key] for f in frames if a <= f["frameNum"] / fps < b and key in f["metrics"]]
        out.append((name, sum(vals) / len(vals) if vals else None))
    return out

def quality():
    if Q.get("cambi") is False and Q.get("vmaf") is False: return
    try:
        has = "libvmaf" in subprocess.run([FFMPEG, "-hide_banner", "-filters"], capture_output=True, text=True, timeout=30).stdout
    except Exception:
        has = False
    if not has:
        skip("cambi", "this ffmpeg has no libvmaf (offline build); banding not measured")
        skip("vmaf", "this ffmpeg has no libvmaf; quality not measured")
        return
    if not os.path.exists(mp4):
        skip("cambi", f"no {mp4} — run encode first"); skip("vmaf", f"no {mp4} — run encode first"); return
    if Q.get("cambi") is not False:
        try:
            fs = libvmaf_frames(mp4, mp4, "cambi"); means = per_scene(fs, "cambi")
            vals = [f["metrics"]["cambi"] for f in fs if "cambi" in f["metrics"]]
            if not vals: skip("cambi", "libvmaf has no cambi feature in this build")
            else:
                print("  CAMBI  per scene: " + ", ".join(f"{n} {v:.1f}" for n, v in means if v is not None) + f"  (max {max(vals):.1f})")
                gate("cambi", [f"{n} {v:.1f} (mean > 6: visible banding)" for n, v in means if v is not None and v > 6],
                     f"(mean {sum(vals) / len(vals):.1f}, max {max(vals):.1f})")
        except Exception as e:
            skip("cambi", f"libvmaf could not measure this file: {e}")
    if Q.get("vmaf") is not False:
        master = (P.get("output") or {}).get("master")
        if not master:
            skip("vmaf", "no output.master")
        elif not os.path.exists(os.path.join(proj, master)):
            gate("vmaf", [f"output.master {master} not found"])
        else:
            try:
                fs = libvmaf_frames(mp4, os.path.join(proj, master)); means = per_scene(fs, "vmaf")
                vals = [f["metrics"]["vmaf"] for f in fs if "vmaf" in f["metrics"]]
                print("  VMAF   per scene: " + ", ".join(f"{n} {v:.1f}" for n, v in means if v is not None) + f"  (mean {sum(vals) / len(vals):.1f})")
                gate("vmaf", [f"{n} {v:.1f} (mean < 93 against the master)" for n, v in means if v is not None and v < 93],
                     f"(mean {sum(vals) / len(vals):.1f})")
            except Exception as e:
                skip("vmaf", f"libvmaf could not measure this file: {e}")

if not LINT_ONLY: quality()

# page checks: captions + illustrative
pg = None
if FULL:
    r = subprocess.run([NODE, os.path.join(os.path.dirname(__file__), "qa_page.mjs"), proj], capture_output=True, text=True)
    if r.returncode:
        err = [l for l in r.stderr.splitlines() if l.startswith("Error")] or r.stderr.strip().splitlines()[-1:] or ["?"]
        gate("captions", ["page check failed: " + err[0]])
    else:
        pg = json.loads(r.stdout.strip().splitlines()[-1])
        gate("captions", pg["captions"], "" if pg["hasCaptions"] else "(no captions on screen)")

# flash: a transition is a luminance swing ≥ 0.1 with the darker side < 0.8; two opposing ones make a flash
if FULL:
    worst = []
    for reg, name in enumerate(("frame", "top-left", "top-right", "bottom-left", "bottom-right")):
        L, tr, ext, d = [x[reg] for x in lums], [], lums[0][reg] if lums else 0, 0
        for i, v in enumerate(L):
            if d >= 0 and ext - v >= 0.1 and v < 0.8 or d <= 0 and v - ext >= 0.1 and ext < 0.8:
                tr.append(i); d = -1 if v < ext else 1; ext = v
            elif d > 0 and v > ext or d < 0 and v < ext:
                ext = v
        for k, i in enumerate(tr):
            n = sum(1 for j in tr[k:] if j < i + fps)
            if n > 6:
                worst.append(f"{i / fps:.2f}s (frame {i}): {n // 2} flashes within 1 s in the {name}"); break
        if worst: break   # one report is enough: the whole frame, or the first quarter that flashes
    gate("flash", worst)

if pg is not None:
    gate("illustrative", pg["illustrative"])
    if Q.get("ai-label") is not False:   # a WARN, never a FAIL
        ai = pg.get("ai", [])
        print("  WARN  ai-label" if ai else "  PASS  ai-label")
        for x in ai[:8]: print(f"          {x}")
    else:
        print("  SKIP  ai-label  (project.json qa.ai-label = false)")

# the film's own code (not tools/, not generated data)
def sources():
    if P.get("renderer") == "remotion":   # the film is React under rm/src/ (tools/renderers/remotion.mjs)
        rs = os.path.join(proj, "rm", "src")
        return sorted(os.path.relpath(os.path.join(d, f), proj).replace(os.sep, "/") for d, _, fs in os.walk(rs) for f in fs
                      if f.endswith((".js", ".jsx", ".mjs", ".ts", ".tsx", ".css")))
    if P.get("renderer") == "hyperframes":
        src = ["hf/film.js", "hf/index.html"]
        if os.path.isdir(os.path.join(proj, "hf/blocks")): src += ["hf/blocks/" + f for f in sorted(os.listdir(os.path.join(proj, "hf/blocks")))]
        return src
    fd = os.path.join(proj, "film")
    return ["film/" + f for f in sorted(os.listdir(fd)) if f.endswith((".js", ".html")) and f not in ("data.js", "clip.js")] if os.path.isdir(fd) else []

src = sources()

# seekable: no clock, randomness, timers or CSS transitions
if FULL:
    BAD = [(r"\bDate\.now\s*\(|\bnew Date\s*\(", "reads the clock"), (r"\bperformance\.now\s*\(", "reads the clock"),
           (r"\bMath\.random\s*\(", "random each run (use a seeded function of t)"), (r"\brequestAnimationFrame\s*\(", "animates in real time"),
           (r"\bset(Timeout|Interval)\s*\(", "timer"), (r"(?<![\w-])transition\s*:", "CSS transition (not seekable)"),
           (r"<video\b[^>]*\bautoplay", "autoplaying video")]
    if P.get("renderer") == "remotion":
        BAD += [(r"\buseFrame\s*\(", "R3F useFrame animates in real time (drive it from useCurrentFrame)"),
                (r"\b(animate|transition)-[a-z]", "Tailwind animate-/transition- class (not seekable)"),
                (r"(?<![\w.])random\(\s*(null|undefined)?\s*\)", "random() without a seed (use random('id'))")]
    hits = []
    for f in src:
        fp = os.path.join(proj, f)
        if not os.path.exists(fp): continue
        for n, line in enumerate(open(fp, encoding="utf-8"), 1):
            if line.lstrip().startswith("//"): continue
            hits += [f"{f}:{n}: {why}" for rx, why in BAD if re.search(rx, line)]
    gate("seekable", hits)

# ── craft lints (source, so they run before a render too) ──────────────────
GENERIC = re.compile(r"""(?:KIT\.easing|K\.easing|\beasing|\bease|\beaseIn|\beaseOut)\s*[:(]\s*['"](ease(?:-in|-out|-in-out)?|linear)['"]|(?:animation-timing-function|transition(?:-timing-function)?|animation)\s*:[^;{}]*\b(ease(?:-in|-out|-in-out)?|linear)\b""")
SCALE0 = re.compile(r"\bscale(?:3d)?\s*\(\s*0(?:\.0+)?(?![\d.])|\bscale\s*:\s*0(?:\.0+)?(?![\d.])")
SHUTTER = re.compile(r"KIT\.shot\.shutter\s*\(([^)]*)\)")
if not QUALITY_ONLY:
    hero, zero, shut = [], [], []
    for f in src:
        fp = os.path.join(proj, f)
        if not os.path.exists(fp): continue
        lines = open(fp, encoding="utf-8").read().splitlines()
        marks = [(n, line) for n, line in enumerate(lines, 1) if not line.lstrip().startswith("//") and re.search(r"data-hero|dataset\.hero\b", line)]
        for n, line in enumerate(lines, 1):
            if line.lstrip().startswith("//"): continue
            for m in SCALE0.finditer(line):
                zero.append(f"{f}:{n}: entrance starts at scale 0 — start at 0.93 (scale-from-zero reads cheap)")
            for m in SHUTTER.finditer(line):
                d = re.match(r"\s*(-?[\d.]+)", m.group(1))
                if d and not (0 <= float(d.group(1)) <= 360):
                    shut.append(f"{f}:{n}: KIT.shot.shutter({d.group(1)}) is outside 0–360")
                if not P.get("motionBlur") and not os.environ.get("REELWRIGHT_BLUR"):
                    shut.append(f"{f}:{n}: KIT.shot.shutter({d.group(1) if d else '…'}) has no effect — motionBlur is off "
                                f'(set project.json "motionBlur": true or pass --blur)')
        if marks:
            name = f
            for _, line in marks:
                m = re.search(r"""KIT\.el\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]""", line) or re.search(r"""\bid\s*[:=]\s*['"]([^'"]+)['"]""", line)
                if m: name = m.group(1); break
            for n, line in enumerate(lines, 1):
                if line.lstrip().startswith("//"): continue
                for m in GENERIC.finditer(line):
                    kw = m.group(1) or m.group(2)
                    hero.append(f"{f}:{n}: hero element {name!r} uses the generic easing {kw!r}; "
                                f"name the intent instead: enter / exit / ambient / impact")
    gate("hero-ease", hero)
    warn("scale-zero", zero)
    gate("shot-shutter", shut)
    if P.get("renderer") == "hyperframes" and any(SHUTTER.search(open(os.path.join(proj, f), encoding="utf-8").read())
                                                  for f in src if os.path.exists(os.path.join(proj, f))):
        print("  WARN  shot-shutter: per-shot shutter is pvk-only; hyperframes uses the project motionBlur")

# plug-in checks, each a file: tools/checks/<name>.py with KIND = "gate" | "warn" (default "warn") and check(ctx) → problem
# lines, plus the tools/checks/<name>.page.mjs ones tools/qa_page.mjs ran. Skippable the same way ("qa": {"<name>": false}).
if FULL:
    import glob, importlib.util
    CTX = dict(proj=proj, P=P, fps=fps, frames=[os.path.join(D, f) for f in files], lums=lums, flat=flat, diffs=diffs, page=pg, mp4=mp4)
    plug = []
    for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), "checks", "*.py"))):
        name, kind = os.path.basename(f)[:-3], "gate"   # a check that can't load or throws is loud: a FAIL
        try:
            spec = importlib.util.spec_from_file_location("check_" + name, f); m = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(m); kind = getattr(m, "KIND", "warn")
            plug.append((name, kind, list(m.check(CTX)) if Q.get(name) is not False else []))
        except Exception as e: plug.append((name, kind, [f"check failed: {e}"]))
    plug += [(n, c["kind"], c["lines"]) for n, c in ((pg or {}).get("checks") or {}).items()]
    for name, kind, lines in plug:
        if kind == "gate": gate(name, lines)

    # ── WARN-only checks (kept apart from the gates above; they never touch the exit code) ──
    if pg is not None:
        if pg.get("warnError"): print(f"  WARN  qa-page: {pg['warnError']}")
        warn("overlap", pg.get("overlap", [])); warn("tiny-text", pg.get("tiny", [])); warn("wordy", pg.get("wordy", []))
        # dark: >2 s where the whole frame is near-black (mean relative luminance < 0.005) and no VO line is playing
        vo = pg.get("vo", [])
        try:
            flats = {round(t * fps) for t in flat}   # near-black AND flat: a dark theme with content on screen isn't a hole
            dk, run = [], None
            for i, l in enumerate(lums + [[1]]):
                t = i / fps
                bad = l[0] < 0.005 and i in flats and not any(a <= t < b for a, b in vo)
                if bad and run is None: run = t
                if not bad and run is not None:
                    if t - run > 2: dk.append(f"{run:.2f}–{t:.2f}s near-black, no voiceover")
                    run = None
            warn("dark", dk)
        except Exception as e: print(f"  WARN  dark: {e}")

    for name, kind, lines in plug:
        if kind != "gate": warn(name, lines)

    # variety: a WARN line when another film in projects/ looks the same (tools/look.mjs); never fails the build
    r = subprocess.run([NODE, os.path.join(os.path.dirname(__file__), "look.mjs"), proj], capture_output=True, text=True)
    print(r.stdout.rstrip() or f"  ?     variety  {r.stderr.strip()[-200:]}")
sys.exit(1 if fails else 0)
