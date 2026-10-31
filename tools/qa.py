# python3 tools/qa.py <project>
# Report: biggest frame-to-frame jumps (should sit on cuts / beats, not mid-shot) and blank or near-uniform
# frames (a missing image, a scene that faded to nothing). Then look at the times it prints.
# Gates, each PASS / FAIL with a time, frame or file; any FAIL exits 1. Skip one with project.json "qa": {"<gate>": false}.
#   loudness      the mp4's audio: integrated within ±1 LU of project.json loudness, true peak ≤ −1 dBTP
#   captions      in the safe area, ≤ 2 lines, contrast ≥ 4.5 (tools/qa_page.mjs)
#   flash         ≤ 3 flashes in any 1 s, over the whole frame or any quarter (WCAG 2.3.1 general flash; red flash not checked)
#   illustrative  numbers on screen come with an "Illustrative data" label; numbers in a screenshot's data-qa-text
#                 pass with that label or a "Source: …" credit (tools/qa_page.mjs)
#   seekable      the film's own code has no clock, randomness, timers or CSS transitions: render(t) must be a pure function of t
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageChops, ImageStat

proj = sys.argv[1]
P = json.load(open(os.path.join(proj, "project.json")))
fps = int(os.environ.get("FPS") or P.get("fps", 60))
D = os.path.join(proj, "frames")
files = sorted(f for f in os.listdir(D) if f.endswith((".jpg", ".png")))   # pvk: f%05d.jpg, hyperframes: frame_%06d.png
prev, diffs, flat, lums = None, [], [], []
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

print("\ngates:")
# loudness: the delivered mp4, so the out name follows --lang / --style / --formats as in tools/render.mjs
suffix = "".join("-" + os.environ[k] for k in ("REELWRIGHT_LANG", "REELWRIGHT_STYLE", "REELWRIGHT_FORMAT") if os.environ.get(k))
mp4 = os.path.join(proj, re.sub(r"(\.mp4)?$", suffix + ".mp4", P.get("out", "out/film.mp4"), count=1))
target = P.get("loudness", -14)
if not os.path.exists(mp4):
    gate("loudness", [f"no {mp4} — run encode first"])
else:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", mp4, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    summ = r[r.rfind("Summary:"):]
    I = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summ); TP = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summ)
    if not I:
        gate("loudness", [f"{mp4} has no audio"])
    else:
        i, tp = float(I.group(1)), float(TP.group(1)) if TP else -99
        gate("loudness", ([f"integrated {i:.1f} LUFS, target {target} ±1"] if abs(i - target) > 1 else []) +
             ([f"true peak {tp:.1f} dBTP (max −1)"] if tp > -1 else []), f"({i:.1f} LUFS, peak {tp:.1f} dBTP)")

# page checks: captions + illustrative
r = subprocess.run(["node", os.path.join(os.path.dirname(__file__), "qa_page.mjs"), proj], capture_output=True, text=True)
if r.returncode:
    err = [l for l in r.stderr.splitlines() if l.startswith("Error")] or r.stderr.strip().splitlines()[-1:] or ["?"]
    gate("captions", ["page check failed: " + err[0]]); pg = None
else:
    pg = json.loads(r.stdout.strip().splitlines()[-1])
    gate("captions", pg["captions"], "" if pg["hasCaptions"] else "(no captions on screen)")

# flash: a transition is a luminance swing ≥ 0.1 with the darker side < 0.8; two opposing ones make a flash
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

# seekable: the film's own code (not tools/, not generated data)
hf = P.get("renderer") == "hyperframes"
if hf:
    src = ["hf/film.js", "hf/index.html"]
    if os.path.isdir(os.path.join(proj, "hf/blocks")): src += ["hf/blocks/" + f for f in sorted(os.listdir(os.path.join(proj, "hf/blocks")))]
else:
    src = ["film/" + f for f in sorted(os.listdir(os.path.join(proj, "film"))) if f.endswith((".js", ".html")) and f not in ("data.js", "clip.js")]
BAD = [(r"\bDate\.now\s*\(|\bnew Date\s*\(", "reads the clock"), (r"\bperformance\.now\s*\(", "reads the clock"),
       (r"\bMath\.random\s*\(", "random each run (use a seeded function of t)"), (r"\brequestAnimationFrame\s*\(", "animates in real time"),
       (r"\bset(Timeout|Interval)\s*\(", "timer"), (r"(?<![\w-])transition\s*:", "CSS transition (not seekable)"),
       (r"<video\b[^>]*\bautoplay", "autoplaying video")]
hits = []
for f in src:
    fp = os.path.join(proj, f)
    if not os.path.exists(fp): continue
    for n, line in enumerate(open(fp, encoding="utf-8"), 1):
        if line.lstrip().startswith("//"): continue
        hits += [f"{f}:{n}: {why}" for rx, why in BAD if re.search(rx, line)]
gate("seekable", hits)
sys.exit(1 if fails else 0)
