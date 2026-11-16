#!/usr/bin/env python3
# Stand-in face detector for tools/selfcheck/measure-face.mjs (same contract as tools/face_detect.py): frames f00001..f00008 of a 1280x720 video.
# 1-3 a centred face, 4-5 none, 6 a face, 7 a face hugging the left edge, 8 none.
import json, os, re, sys

BOX = {1: [[540, 160, 200, 240]], 2: [[540, 160, 200, 240]], 3: [[560, 170, 220, 260]], 6: [[600, 150, 200, 240]], 7: [[20, 300, 150, 180]]}
print(json.dumps({f: BOX.get(int(re.search(r"f(\d+)\.jpg$", f).group(1)), []) for f in sys.argv[1:]}))
