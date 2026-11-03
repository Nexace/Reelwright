# What Reelwright has today (v0.1.x, verified from the code 2026-11-02)

Repo root: <local path> Project/reelwright. Check details in the code when you need them.

- Pipeline (README "Every command"): script lines in project.json → edge-tts voiceover with word times (tools/vo.py)
  → sched.py places lines on a beat grid → film.js `render(t)` (pure function of t) → frames → ffmpeg encode with
  ducked music, SFX cues, loudness mix (tools/mix.py, music.py, beatgrid.py with drop detection) → QA gates
  (tools/qa.py: blank frames, jumps, loudness, caption overflow/contrast, flash rate, "Illustrative data" lint,
  seekable-animation lint) → .srt/.vtt captions, manifest, `verify` reproducibility.
- Two renderers: `pvk` (Playwright screenshots of film/index.html) and `hyperframes` (vendored HyperFrames
  producer, Apache-2.0, vendor/hyperframes/; 239 catalog components; GSAP-based registry blocks deliberately left
  out because they need GSAP + CDN fonts). Rule: only seekable animation — no GSAP/anime timelines left playing,
  no CSS transitions, rAF, Date.now, Math.random.
- Engine tools/engine.js (KIT): clamp seg lerp win; easings E = inOut, out, outExpo, in, outBack only;
  music grid beat/bar/snap/pulse/drop; VO word timing V/W/WE/align/words; captions (karaoke word captions,
  captionCues, subtitles); DOM helpers el/css/show/img; screen recording playback clip/camAt/phone/browser/
  cursor/magnifier; HF catalog block(); count (count-up numbers); cue (SFX: whoosh, pop, tap, click, impact,
  chime, riser, glitch); theme ease/dur (KIT.ease = one easing per theme, KIT.dur = tempo multiplier).
- No SVG path drawing / stroke draw-on helper, no math/graph primitives (axes, function plots, LaTeX), no Lottie
  player, no spring/physics easing, no named camera-shot presets beyond camAt keyframes, no GSAP.
- Layouts tools/layouts.js: split, fullBleed, bento, tiltedDevice, stat, quote, kinetic (all read theme tokens,
  adapt to 16x9/9x16/1x1).
- Themes themes/*.css (10): editorial brutalist pastel dark-tech playful retro swiss luxury clean neon; tokens
  --kit-* incl. --kit-ease, --kit-tempo; brand.json overrides; `theme-from <url|image>` drafts a theme;
  17 bundled OFL font families in fonts/.
- Formats --formats 16x9,9x16,1x1 with KIT.safe; --lang re-voicing; preview scrubber; remix; from-url (capture
  a site, draft an HF project); frame cache; Colab cloud render (cloud/).
- Docs: docs/PLAYBOOK.md (story, truthfulness, picture, sound, process, engine rules, HF films, layouts).
  Agent skill: .claude/skills/product-video/SKILL.md; AGENTS.md.
- Rules: MIT; standalone toolkit (no MCP server/plugin); core free, local, offline; macOS + Windows native, no WSL;
  vendored code keeps license + NOTICE + VENDORED.md; scratch files in scratch/ (git-ignored).
