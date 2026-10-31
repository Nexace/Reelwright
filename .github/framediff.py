# python .github/framediff.py <frames-a> <frames-b> [out-dir]
# Two renders of the same film must match frame for frame, within Chromium's software-raster noise: at most
# MAX_PIXELS pixels per frame off by more than NOISE/255. The noise is a few antialiased pixels on scaled or
# moving layers, off by anything up to ~25/255, so the check counts pixels rather than capping the delta
# (a real change, even one glyph, moves hundreds). Writes the worst frame pair to out-dir.
import os, shutil, sys
from PIL import Image, ImageChops

NOISE, MAX_PIXELS = 2, 64
a, b = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
fa, fb = sorted(os.listdir(a)), sorted(os.listdir(b))
if fa != fb:
    sys.exit(f"frame lists differ: {len(fa)} vs {len(fb)} files")
bad, worst = [], None
for f in fa:
    pa, pb = os.path.join(a, f), os.path.join(b, f)
    if open(pa, "rb").read() == open(pb, "rb").read():
        continue
    d = ImageChops.difference(Image.open(pa).convert("RGB"), Image.open(pb).convert("RGB")).convert("L")
    delta = d.getextrema()[1]
    pixels = sum(d.histogram()[NOISE + 1:])
    print(f"  {f}: {pixels} px differ by more than {NOISE}/255, max {delta}/255")
    if worst is None or (pixels, delta) > worst[:2]:
        worst = (pixels, delta, f)
    if pixels > MAX_PIXELS:
        bad.append(f)
if worst and out:
    os.makedirs(out, exist_ok=True)
    shutil.copy(os.path.join(a, worst[2]), os.path.join(out, "run1.png"))
    shutil.copy(os.path.join(b, worst[2]), os.path.join(out, "run2.png"))
print(f"{len(fa)} frames, {'all identical' if not worst else f'worst {worst[2]}: {worst[0]} px, max {worst[1]}/255'}")
if bad:
    sys.exit(f"{len(bad)} frame(s) beyond tolerance (more than {MAX_PIXELS} px off by more than {NOISE}/255): {' '.join(bad)}")
