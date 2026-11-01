# python3 tools/sheet.py <project>  → <project>/stills/sheet.jpg, a contact sheet of every still
# (run `video.sh stills <project>` first). Fast way to eyeball the whole film or send a review.
# python3 tools/sheet.py <project> stills-remix  → stills-remix/sheet.jpg: one labelled row per folder (reelwright remix)
import os, sys
from PIL import Image, ImageDraw, ImageFont

proj = sys.argv[1]
if len(sys.argv) > 2:
    D = os.path.join(proj, sys.argv[2])
    rows = sorted(d for d in os.listdir(D) if os.path.isdir(os.path.join(D, d)))
    RH, LW, G = 360, 300, 12                      # row height, label column, gap
    ims = [[Image.open(os.path.join(D, r, f)).convert("RGB") for f in sorted(os.listdir(os.path.join(D, r))) if f.endswith(".jpg")] for r in rows]
    ims = [[i.resize((round(RH * i.width / i.height), RH)) for i in row] for row in ims]
    W = LW + max(sum(i.width + G for i in row) for row in ims)
    sheet = Image.new("RGB", (W, len(rows) * (RH + G) + G), "#222")
    draw = ImageDraw.Draw(sheet)
    try: font = ImageFont.load_default(size=28)
    except TypeError: font = ImageFont.load_default()   # Pillow < 10.1
    for k, (r, row) in enumerate(zip(rows, ims)):
        y = G + k * (RH + G)
        draw.multiline_text((G, y + 8), r.split(" ", 1)[-1].replace(" · ", "\n"), fill="#eee", font=font, spacing=10)
        x = LW
        for i in row: sheet.paste(i, (x, y)); x += i.width + G
    sheet.save(os.path.join(D, "sheet.jpg"), quality=86)
    print(os.path.join(D, "sheet.jpg"), len(rows), "looks")
    sys.exit()
D = os.path.join(proj, "stills")
files = sorted(f for f in os.listdir(D) if f.startswith("t") and f.endswith(".jpg"))
iw, ih = Image.open(os.path.join(D, files[0])).size
per = 4 if iw >= ih else 6                     # keeps the film's aspect ratio (16:9 or 9:16)
w = 480 if iw >= ih else 270
h = round(w * ih / iw)
rows = (len(files) + per - 1) // per
sheet = Image.new("RGB", (per * w + (per - 1) * 8, rows * h + (rows - 1) * 8), "#222")
for i, f in enumerate(files):
    sheet.paste(Image.open(os.path.join(D, f)).convert("RGB").resize((w, h)), ((i % per) * (w + 8), (i // per) * (h + 8)))
sheet.save(os.path.join(D, "sheet.jpg"), quality=86)
print(os.path.join(D, "sheet.jpg"), len(files), "stills")
