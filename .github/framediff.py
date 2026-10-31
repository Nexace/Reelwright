# python .github/framediff.py <frames-a> <frames-b> [out-dir]
# Two renders of the same film must match frame for frame, within Chromium's software-raster noise:
# no pixel off by more than MAX_DELTA/255 and at most MAX_PIXELS changed pixels per frame (antialiased
# edges of scaled or moving layers; see vendor/hyperframes/VENDORED.md). Writes the worst frame pair to out-dir.
import os, shutil, sys
from PIL import Image, ImageChops

MAX_DELTA, MAX_PIXELS = 8, 500
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
    pixels = sum(d.histogram()[1:])
    print(f"  {f}: {pixels} px differ, max {delta}/255")
    if worst is None or (delta, pixels) > worst[:2]:
        worst = (delta, pixels, f)
    if delta > MAX_DELTA or pixels > MAX_PIXELS:
        bad.append(f)
if worst and out:
    os.makedirs(out, exist_ok=True)
    shutil.copy(os.path.join(a, worst[2]), os.path.join(out, "run1.png"))
    shutil.copy(os.path.join(b, worst[2]), os.path.join(out, "run2.png"))
print(f"{len(fa)} frames, {'all identical' if not worst else f'worst {worst[2]}: max {worst[0]}/255, {worst[1]} px'}")
if bad:
    sys.exit(f"{len(bad)} frame(s) beyond tolerance (max {MAX_DELTA}/255, {MAX_PIXELS} px): {' '.join(bad)}")
