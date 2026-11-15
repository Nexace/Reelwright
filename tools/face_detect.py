# python3 tools/face_detect.py <image> [<image> ...]  →  JSON on stdout: { "<image>": [[x, y, w, h], ...], ... } (pixels, top-left origin)
# The face detector behind `reelwright face` (tools/measure_face.mjs). It uses OpenCV's Haar frontal-face cascade, which ships inside the
# opencv-python wheel (no separate model download), so the only step is `pip install opencv-python-headless`. Nothing is installed or
# downloaded here: without cv2 it exits 3 and says so. Haar finds frontal faces only: profile, tilted and tiny faces are missed, and a
# false positive on a texture is possible, so treat the numbers as a screening measure, not ground truth.
import json, sys

try:
    import cv2
except ImportError:
    sys.stderr.write("face detection needs OpenCV: pip install opencv-python-headless (it carries the Haar cascade; nothing is downloaded by reelwright)\n")
    sys.exit(3)

casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
out = {}
for f in sys.argv[1:]:
    im = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
    if im is None:
        out[f] = []
        continue
    h = im.shape[0]
    s = 640 / h if h > 640 else 1.0   # detect on a 640 px tall copy: faster, same boxes after scaling back
    sm = cv2.resize(im, None, fx=s, fy=s) if s != 1.0 else im
    boxes = casc.detectMultiScale(cv2.equalizeHist(sm), scaleFactor=1.1, minNeighbors=5, minSize=(max(24, int(sm.shape[0] * 0.04)),) * 2)
    out[f] = [[int(v / s) for v in b] for b in boxes]
print(json.dumps(out))
