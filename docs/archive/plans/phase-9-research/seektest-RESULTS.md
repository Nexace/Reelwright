# Seek-determinism results (lottie-web, GSAP)

Dir: scratch/phase9/seektest/ (git-ignored)
Run: `node gen-lottie.mjs && node run.mjs`  (about 65 s; writes results.json with per-t sha256 hashes)

## Method
Headless Chromium from the repo's Playwright, `--force-device-scale-factor=1`, deviceScaleFactor 1, viewport 800x600, 400x400 clip, white background,
file:// pages, no Math.random. 24 times t spread evenly over 0..duration (both ends included). Four passes per variant, each frame is
`render(t)` then a rAF, then a PNG screenshot, then sha256 of the PNG bytes:
1. page A, forward order; 2. fresh page B (same browser), fixed shuffle (seed 1234); 3. page A again, a different fixed shuffle (seed 987);
4. a fresh browser process, reverse order.
A t counts as matched only if all four hashes are equal. "distinct" = distinct hashes among the 24 frames (proves the page really animates).

## Versions (as declared in package.json)
- lottie-web 5.13.0, license MIT
- gsap 3.15.0, license "Standard 'no charge' license: https://gsap.com/standard-license" (not OSI; free for use but with restrictions, read it before bundling or redistributing)
- pngjs 7.0.0, MIT (only used to count differing pixels)

## Results (matched / 24, all four passes)
| Variant | matched | distinct frames |
|---|---|---|
| lottie svg, goToAndStop(t*1000, false), subframe=true | 24/24 | 24 |
| lottie svg, goToAndStop(t*1000, false), subframe=false | 24/24 | 24 |
| lottie svg, goToAndStop(t*30, true), subframe=true | 24/24 | 24 |
| lottie svg, goToAndStop(t*30, true), subframe=false | 24/24 | 24 |
| lottie canvas, ms, subframe=true | 24/24 | 24 |
| lottie canvas, ms, subframe=false | 24/24 | 24 |
| lottie canvas, frames, subframe=true | 24/24 | 24 |
| gsap, totalTime(t) default ticker | 24/24 | 24 |
| gsap, totalTime(t, true) (suppressEvents) | 24/24 | 24 |
| gsap, gsap.ticker.lagSmoothing(0) | 24/24 | 24 |
| gsap, gsap.ticker.sleep() | 24/24 | 24 |
| gsap, gsap.ticker.remove(gsap.updateRoot) | 24/24 | 24 |

Mismatches: none, so no pixel diffs to report (diff code in run.mjs, uses pngjs, untriggered).

## Lottie notes
- Test animation: anim.json from gen-lottie.mjs. 400x400, 30 fps, 90 frames (3 s). Layers: rounded rect with bezier-eased position and scale, a stroked 5-point star
  rotating 0 to 720 deg with eased rotation, a circle with a 3-keyframe eased opacity. No expressions, images or text.
- Cross-variant: ms/isFrame=false and frames/isFrame=true give identical pixels at the same t (24/24 for both subframe settings), as long as t*1000 maps to the same frame (fps 30).
  subframe=true vs subframe=false differ at 22/24 times: subframe=true interpolates fractional frames (smooth), subframe=false snaps to whole frames (the film steps at 30 fps).
  For video at 60 fps from a 30 fps Lottie, use subframe=true (the lottie-web default) or you get duplicate frames. Both are deterministic.
- Canvas renderer was also identical across passes (not compared to svg; svg and canvas pixels differ by nature).
- t at the end (3.0 s = frame 90, the out-point) rendered fine and matched.
- Sanity: a visual check of t=1.5 gave the expected frame (peek-lottie.png).

## GSAP notes
- Test timeline (gsap.html): fromTo power3.out on x/y/scale/rotation/opacity, elastic.out(1,0.3), back.inOut(1.7) and (2), a 3-element stagger, a strokeDashoffset
  tween (no DrawSVG), and a second sequential .to() on the same property of the same element (x of #b) to probe path dependence. Duration 2.8 s. render(t) = tl.totalTime(t).
- Seeking forward, backward and shuffled, across fresh pages and browsers: identical bytes. fromTo() everywhere is the key: with plain .to()/.from() the start value is
  captured on first render, which is order-dependent in principle. The sequential .to() chain tested here was still fine because a timeline renders earlier tweens first.
  Relative values ("+=") and .from() were not tested.
- Ticker/rAF: the timeline is paused, so the global ticker never moves it. Tested default, lagSmoothing(0), ticker.sleep() and removing updateRoot (freezes the global timeline):
  all produce the same hashes as each other (checked afterwards: all five gsap variants have identical pass-0 hashes). No console messages, warnings or errors were emitted in any variant (logs captured, all empty).
  Practical advice: still call gsap.ticker.lagSmoothing(0) or ticker.sleep() in a film page, so a stalled screenshot cannot desync anything driven by the global timeline.
- Sanity: visual check at t=1.5 (peek-gsap.png) showed the expected elements.

## Files
- gen-lottie.mjs, anim.json, lottie-svg.html, lottie-canvas.html, gsap.html, run.mjs, peek.mjs, results.json, RESULTS.md
