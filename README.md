# Reelwright

**Make polished product videos from code** — app walkthroughs, launch films, explainers — with free,
local tools. No video editor, no paid services, no stock-footage subscriptions.

[![CI](https://github.com/Nexace/reelwright/actions/workflows/ci.yml/badge.svg)](https://github.com/Nexace/reelwright/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

You write a script, a scripted screen recording and a small HTML "edit". The kit voices the script with
neural TTS, records your product with Playwright, cuts every shot to the spoken words and the music's
beat, renders 1080p60 frames in headless Chrome, designs the sound, mixes, and encodes an mp4.
Because the whole edit is code, changing a line of the script or re-recording a screen re-flows the
film with one command.

```bash
git clone https://github.com/Nexace/reelwright && cd Reelwright
./setup.sh          # once: ffmpeg, Node, Python libs, headless Chromium (Windows: node setup.mjs)
./video.sh all      # (Windows: node bin/reelwright.mjs all) builds the example → projects/example/out/tidy-example.mp4 (~1 min)
```

---

## Sample films
