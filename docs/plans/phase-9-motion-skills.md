# Phase 9 plan: motion skills from nine open-source repos, plus optional generation connectors

Status: **plan, waiting for the owner's OK.** Nothing here is built yet. Written 2026-11-02.

The research notes behind every claim below are in `scratch/phase9/` (git-ignored; one file per repo group:
`manim.md`, `remotion-gsap.md`, `doodle-lottie.md`, `shots-motion.md`, `providers.md`). Repos were read via
`gh api` and shallow clones in `scratch/phase9/src/`. Claims we could not check are marked **UNVERIFIED**.

## Rules for this phase

- **The core stays free, local and offline.** Every core command works with no account, key or network beyond what
  exists today (edge-tts voiceover, `setup` downloads). Paid services exist only as opt-in connectors, off by default.
- Standalone toolkit (no MCP server or plugin); native on macOS and Windows, no WSL; Reelwright stays MIT.
- `render(t)` stays a pure function of t: every new primitive is closed-form in t (or seeded by an element id and
  `floor(t × rate)`), never `Math.random`, rAF or a running clock.
- Nothing is copied from a repo that has no license or a non-commercial one; it is rewritten from documented behavior.
  Vendoring anything needs the owner's OK first (KaTeX is the only candidate, see 9c).

## What Reelwright already has (checked in the code)

Beat grid, VO word timing, karaoke captions, SFX cues, loudness mix, QA gates (blank, jumps, loudness, captions,
flash, illustrative label, seekable lint), 10 themes with `--kit-ease`/`--kit-tempo`, 7 layouts, 3 formats, preview,
remix, from-url, theme-from, frame cache, Colab. Gaps that the nine repos fill: only 5 easings (`inOut out outExpo in
outBack`), no cubic-bezier or spring, no stagger helper, no named camera shots (only `camAt` zoom + focal point), no SVG
stroke draw-on or seeded "boil", no math primitives or equations, no beat-sheet import, no GSAP guidance, no generation.

## Coverage table

| # | Repo | What it offers | Reelwright already has | License (verified) | Approach | Effort | Checkpoint |
|---|---|---|---|---|---|---|---|
| 1 | albertobarnabo/manim-craft | Manim scene rules, contact-sheet review loop, pacing, QA ideas (text overlap, tiny text, >6 words on screen, long dark stretches) | contact-sheet loop (`stills`), count-up numbers, push-ins, real VO word times | **None** (license API 404, no LICENSE file) | Adopt rules as docs + re-implement QA checks natively (rewrite only) | S–M | 9a (docs), 9c (QA) |
| 2 | remotion-dev/skills | Remotion agent rules: spring, interpolate, sequencing, transitions, audio sync, captions | VO timing, captions, beat sync | **None** in the repo; Remotion itself is a custom license (free for individuals and small teams, paid company license) | Re-implement the math natively (spring, keyframes, local time, transition overlap rule); vendor nothing | S | 9a |
| 3 | alexgreensh/anidoodle | Hand-drawn Canvas animation: seeded jitter, boil, pressure ribbons, draw-on, stroke timing by length | nothing doodle; determinism rule is the same as ours | Apache-2.0 | Re-implement as SVG (works in both renderers): doodle theme + draw-on + seeded boil; no vendoring | M | 9b |
| 4 | LottieFiles/motion-design-skill | Motion principles, cubic-bezier tables, 4 personality archetypes, spring ranges, stagger budgets (no Lottie code) | `--kit-ease`, `--kit-tempo` | MIT | Adopt as docs + per-theme easing/timing tokens (rewrite as tokens; credit in THIRD_PARTY.md) | S–M | 9a |
| 5 | sfgdfgd/-skill (fork of Vincentwei1021/video-shotcraft) | ~25 camera/time shots (push-in, pull-back, crash zoom, whip pan, orbit, crane, fake dolly zoom, dutch roll, handheld, speed ramp) as Remotion cards | `camAt` (zoom + focal point) only | Apache-2.0 (bundled audio is Mixkit / untraceable: not taken) | Re-implement as a named shot library (closed-form in t); credit in THIRD_PARTY.md | M (8 shots), L (all) | 9b |
| 6 | adithya-s-k/manim_skill | Manim CE / ManimGL API rules for agents | nothing math | MIT root and CE part; **ManimGL part CC BY-NC-SA 4.0** (non-commercial: not used) | Use as the list of primitives users expect; native math primitives (decision below) | M | 9c |
| 7 | cth9191/motion-design | Higgsfield workflow; `presets.json` timeline `{start_s,end_s,label}`, review checklist, prompt guidance | sections via VO lines | **None** (ATTRIBUTION.md: prompts belong to Higgsfield article authors) | Free parts rewritten as docs; generation only via the optional connector | S | 9c (free), 9d (paid) |
| 8 | docusphere/claude-skill-motion-graphics | Beat-sheet CSV (`Scene,Beat Label,VO Script,VO Length,Clip Duration,SHOT,MOTION,TEXT ON SCREEN,SFX,IMG PROMPT,VID PROMPT`), VO punctuation tips; generation via Higgsfield CLI | script in project.json | **None** (README says MIT, but no LICENSE file; API 404) | Rewrite a CSV importer/exporter (free); generation only via the optional connector | S–M | 9c (free), 9d (paid) |
| 9 | greensock/gsap-skills | GSAP API guidance for agents | HF vendored runtime already has a GSAP adapter (`vendor/hyperframes/core/dist/adapters/gsap.js`, seeks paused timelines); GSAP itself not vendored | MIT (the skills). **GSAP library: Webflow "Standard No Charge" license**, not MIT | Docs (seekable GSAP section) + re-implement GSAP eases natively; do not vendor GSAP | S | 9a |

## Hard cases

### Manim (repos 1 and 6): native primitives, not a Manim renderer

| | (a) native math primitives in the engine | (b) Manim CE as optional third renderer |
|---|---|---|
| Install | nothing new for plots/axes; KaTeX (MIT, ~4 MB unpacked) only for equations | Python + Manim CE + Cairo/Pango + ffmpeg + LaTeX. macOS: pycairo has no macOS wheels (needs `brew install cairo pkg-config` + source build); Windows may need MSVC Build Tools; LaTeX (MacTeX/MiKTeX) runs to gigabytes (exact sizes **UNVERIFIED**) and Manim's number mobjects need it |
| Determinism | closed-form in t, frames out of order and in parallel like today | Manim plays scenes in order and mutates state; its docs and CLI offer no "render the frame at time t", so it breaks parallel out-of-order frames, the frame cache, `verify`, and beat timing (would need Python-side timing from kit data) |
| License | KaTeX MIT; our code MIT | Manim CE MIT (verified); pycairo LGPL-2.1-only OR MPL-1.1; LaTeX distributions mixed |
| Fit | theme tokens, formats, captions and layouts work unchanged in pvk and hyperframes | tokens hand-translated to Manim colors/fonts; each format a separate render; captions/layouts not shared |

**Recommendation: (a).** New `tools/math.js`: `KIT.math.axes`, `numberLine`, `plot(fn)`, `grid`, path `morph`
(resampled point lists, lerped), Write/Create-style draw-on (shared with 9b), `thereAndBack` and `smooth` easings, and
equations via KaTeX (per-glyph reveal; no true glyph stroke draw-on — MathJax would allow that at ~34 MB, not planned).
KaTeX is vendored only with the owner's OK (it is the one vendoring in this phase).

### Higgsfield-based repos (7 and 8): free first, paid only through the connector

Free, built in 9c: beat-sheet CSV import/export (both docusphere header variants; prompt columns kept as notes, never
sent anywhere), `presets.json`-style `timeline[]` → sections, the review checklist and VO punctuation tips in
PLAYBOOK. **Works only with the connector (9d):** generating stills, clips, motion-transfer and any image/video from the
`IMG PROMPT`/`VID PROMPT` columns. Both repos also generate voiceover and music through Higgsfield; Reelwright keeps its
own free voiceover and music and does not add those.

## Checkpoints

Each checkpoint is one branch and one chat. Run them in order (9d may run before 9c if the owner prefers).

### 9a — Motion vocabulary: eases, springs, per-theme timing, GSAP and craft docs
**Branch:** `phase-9a-motion` · **Repos:** 2, 4, 9, 1 (docs part)

Files: `tools/engine.js`, `themes/*.css`, `tools/kit.css` (new tokens only), `docs/PLAYBOOK.md`, `scratch/` tests.
1. `KIT.E` gains GSAP-equivalent eases, rewritten from their formulas: power1–4, sine, circ, expo (exact at 1, unlike
   today's `outExpo`), back, elastic (inOut default period 0.45), bounce, steps(n) (GSAP's k/(n+1) jumps), each with
   `in/out/inOut` (`in(p) = 1 − out(1 − p)`). Keep the five existing names working unchanged.
2. `KIT.bezier(x1,y1,x2,y2)` (fixed-iteration Newton + bisection, stateless), `KIT.spring({mass:1, damping:10,
   stiffness:100})` closed form (under/critical/over-damped; damping ratio ≥ 1 uses the critical formula, as Remotion
   does), `KIT.keys(t, [[t0,v0],[t1,v1],...], eases)`, `KIT.stagger(i, n, total)`, `KIT.local(from, dur, rate)`.
3. Per-theme presets: tokens `--kit-ease-in` (exits), `--kit-stagger`, `--kit-settle`, mapped from the four archetypes:
   playful → Playful (bounce settle, 10–20 % overshoot); luxury/editorial/pastel/retro → Premium (bezier .4,0,.2,1);
   clean/swiss → Corporate (bezier .2,0,0,1); brutalist/neon/dark-tech → Energetic (expo). Use the skill's UI
   durations as ratios only. `KIT.ease`/`KIT.dur` keep working.
4. PLAYBOOK: a **GSAP section** (allowed only as a paused timeline driven by `tl.totalTime(t)` from `render(t)`; no
   `repeat:-1`, no `random()`, no rAF; HyperFrames' adapter already seeks `window.__timelines`; GSAP is not bundled,
   so a film using it must ship a local copy under `hf/` and keep Webflow's notice), motion rules (never linear for
   spatial moves, ≤ 1/3 screen per move without a keyframe, morph over fade, dim others to ~0.25 to focus, on-screen
   text is labels and numbers not the narration), stagger budgets, transition overlap rule (total = sum − overlaps).

Exit test: `node scratch/ease-check.mjs` compares every ease against reference values recorded from gsap 3.15.0 (in
`scratch/phase9/remotion-gsap.md`) within 1e-6 and the spring against a numeric ODE; pvk `example` stills byte-identical
to `main` (`cmp`); `example-hf` built in playful vs luxury shows different settle timing in stills; CI green.

### 9b — Named shot library and the doodle theme
**Branch:** `phase-9b-shots-doodle` · **Repos:** 5, 3

Files: new `tools/shots.js` (loaded like `layouts.js`; the HF renderer copies it), new `tools/doodle.js`,
`themes/doodle.css`, `fonts/<handwriting>/` + `fonts/LICENSES.md`, `tools/kit.css`, `docs/PLAYBOOK.md`,
`projects/shots-hf/` (example film), `THIRD_PARTY.md` (credit video-shotcraft and anidoodle as references).
1. `KIT.shot.<name>(el, {in, out, ...})` → `{ set(t) }`: `pushIn` (1.00 → 1.14, accelerating, hard cut out),
   `pullBack`, `crashZoom` (1 → 2.6 in 6 frames + 14 px decaying shake), `whipPan` (+ brake variant, motion blur by
   speed), `dollyZoom` (fake: subject pinned, background scales), `orbit`, `craneRise`, `dutchRoll` (−10° → +1.2° → 0),
   `handheld` (seeded noise on `floor(t × 24)`), `remap` (speed ramp / freeze). Zoom via CSS `zoom` where text must stay
   sharp. Parameters from `scratch/phase9/shots-motion.md` table 1.4.
2. `KIT.rng(seed)` (seeded PRNG keyed by element id), `KIT.draw(svgPath, p)` (stroke draw-on: `pathLength=1`,
   `stroke-dashoffset = 1 − p`), `KIT.boil(el, t)` (re-jitter control points ±0.55 px on `floor(t × 8)`, so pvk and
   hyperframes match), stroke timing by length (cost = length + 9 per stroke, time shared by cost, from anidoodle).
3. `themes/doodle.css`: paper tile (static, procedural), ink palette, handwriting display font — candidate OFL fonts
   (Caveat, Patrick Hand) to be fetched with `fonts/fetch.mjs` and their OFL read before use (**UNVERIFIED** today).
4. PLAYBOOK: camera grammar (≤ 2 big moves per film, one mover per segment, stillness after a move, blur only in the
   fast part).

Exit test: `reelwright all shots-hf` passes QA; stills show each shot mid-move; `reelwright verify shots-hf` gives the
same frames on a fresh render (boil and handheld are seeded); the doodle theme renders `example-hf` with draw-on
visible in stills; pvk `example` unchanged; CI green.

### 9c — Math primitives, beat-sheet import, new QA checks
**Branch:** `phase-9c-math-beats` · **Repos:** 6, 1, 7 and 8 (free parts)

Files: new `tools/math.js`, `vendor/katex/` (only with the owner's OK: LICENSE, VENDORED.md, NOTICE/THIRD_PARTY entry),
`tools/beats.mjs` + `bin/reelwright.mjs` (`beats import <csv>` → project.json lines/sections, `beats export`),
`tools/qa.py`/`tools/qa_page.mjs` (new checks), `projects/math-hf/`, `docs/PLAYBOOK.md`.
1. Math primitives as decided above, theme-token colored, in both renderers.
2. Beat sheet: import accepts both docusphere headers; maps `VO Script` → lines, `Scene/Beat Label` → ids,
   `SHOT/MOTION` → comments for the writer, `TEXT ON SCREEN` → a note; prompt columns stay in the CSV and are never
   sent anywhere. Export writes the same header from a project. Also `timeline[]` (`{start_s,end_s,label}`) import.
3. QA (warnings first, never failing existing films): on-screen text overlap, text below a minimum height per format,
   more than 6 words of on-screen text that duplicate the narration, long dark stretches.
4. Lottie: document only. The vendored HyperFrames runtime already has a Lottie adapter (`data-lottie-src`,
   `window.lottie`); lottie-web (MIT) is not bundled and byte-identical seeking is **UNVERIFIED**, so PLAYBOOK says
   "export to MP4/PNG sequence and use it as a clip"; revisit only on request.

Exit test: `reelwright all math-hf` passes QA with axes, a plot, a morph and one KaTeX equation visible in stills;
`reelwright beats import scratch/beats.csv` round-trips through `beats export` (diff shows only prompt columns kept
verbatim); `qa projects/qa-broken` trips each new check; pvk `example` unchanged; CI green.

### 9d — Optional generation connectors (Higgsfield, Adobe Firefly)
**Branch:** `phase-9d-connectors` · **Repos:** 7, 8 (paid parts)

Files: new `tools/gen.mjs` + `tools/gen/firefly.mjs`, `tools/gen/higgsfield.mjs`, `tools/gen/mock.mjs`,
`bin/reelwright.mjs` (`gen`), `tools/engine.js` (`KIT.aiLabel`), `tools/qa.py` (AI-label gate), `.gitignore`,
`docs/CONNECTORS.md`, `scratch/gen-test.mjs`.

**Command.** `reelwright gen [project] --provider firefly|higgsfield [--model <id>] [--kind image|video] "<prompt>"
--out assets/<file>`. Off by default: without `--provider` nothing loads, and no core command imports `tools/gen/`.

**Provider interface** (one file per provider): `{ name, envKeys: [...], async submit({prompt, kind, model, opts},
creds) → job, async poll(job, creds) → { status, urls[] } }`. `gen.mjs` does credentials, caching, download, manifest
and polling with backoff (honours `Retry-After`); adding a provider is one file.

**What the providers actually offer (official docs, read 2026-11-02; details in `scratch/phase9/providers.md`):**
- Higgsfield: REST API at `api.higgsfield.ai`, header `Authorization: Key <id>:<secret>` (keys from the Higgsfield
  console), async (submit → `request_id`/`status_url` → poll until completed/failed/nsfw/canceled), results as
  `images[].url` / `video.url` kept 7 days. Billing is pay-as-you-go balance per the docs; per-model prices are not
  published (**UNVERIFIED**, not quoted). Its MIT CLI needs browser login and "a paid Higgsfield subscription", so the
  connector uses REST, not the CLI. Terms: no restriction on commercial use of outputs; disclose AI output where law
  requires; Higgsfield may train on inputs and outputs without an Enterprise Agreement.
- Adobe Firefly API (Firefly Services): `firefly-api.adobe.io`, OAuth server-to-server `client_credentials` at Adobe
  IMS, async jobs, images (`/v3` and `/v4/images/generate-async`) and video (`/v3/videos/generate`), outputs carry
  Content Credentials. **Access is not shown as part of Creative Cloud Pro:** the official docs assume an Adobe
  representative and an enterprise admin or developer role, and the consumer plan pages mention no API. So the Firefly
  connector works only for enterprise-entitled accounts; a CC Pro individual uses the manual import below. Terms forbid
  removing Content Credentials. Pricing and an individual/trial path: **UNVERIFIED**.
- Adobe Express: no individual generation API (its REST API automates documents). **Manual only:** export PNG or MP4
  from Express, drop it into `projects/<name>/assets/`, use it like any image or clip; documented in CONNECTORS.md.

**Credentials.** Environment variables only (`HIGGSFIELD_API_KEY_ID`, `HIGGSFIELD_API_KEY_SECRET`,
`FIREFLY_CLIENT_ID`, `FIREFLY_CLIENT_SECRET`) or a git-ignored `.reelwright/credentials.json` (added to `.gitignore`
in this checkpoint). Never written to the repo, project.json, logs, stdout or manifests; errors print the variable
name, never the value. A missing key: one clear message naming the variables, exit code 2, no files touched.

**Cache and manifest.** Key = sha256 of `{provider, model, kind, prompt, opts}`. The downloaded file is stored as
`assets/<out>` plus `assets/.gen/<key>.<ext>`; `assets/gen.json` records `{file, key, provider, model, kind, prompt,
date, sourceUrlHost}` — no secrets, no signed URLs. A cache hit never calls the service, so a film rebuilds the same
and offline. `reelwright verify` checks gen assets against their sha256 like any input.

**Label.** `KIT.aiLabel(el, text = 'AI-generated')` puts a small label in the safe area; a new QA gate warns when a
film loads a file listed in `gen.json` with no AI label on screen (same pattern as the "Illustrative data" lint).
Firefly images keep their Content Credentials as delivered (never stripped); the video re-encode dropping them is
listed under Risks.

Exit test: `node scratch/gen-test.mjs` runs both providers against `tools/gen/mock.mjs` (mocked submit/poll/download
from the documented shapes) and checks: cache hit makes zero calls, manifest has no key/secret/signed URL (grep), a
missing key exits 2 with no file changes (`git status` clean), 429 + Retry-After is honoured. CI runs it with **no
keys**. **No real call is made in this checkpoint unless the owner asks for one and approves the cost.**

### 9e — Release and cleanup
**Branch:** `phase-9e-release`

1. Update README (new commands `gen`, `beats`; shots, doodle, math; connectors marked **optional**, with a "works
   without any connector" list), AGENTS.md, docs/PLAYBOOK.md, `.claude/skills/product-video/SKILL.md`,
   THIRD_PARTY.md (credits: video-shotcraft, anidoodle, motion-design-skill, gsap-skills, Remotion skills as
   references; KaTeX if vendored) and NOTICE (KaTeX if vendored). Bump `package.json` to 0.2.0 and tag `v0.2.0`.
2. Cleanup: list unneeded files with sizes (scratch clones, renders, `frames/`, `stills/`, caches, stray files such as the
   self-referencing `reelwright` symlink in the repo root), **wait for the owner's OK before deleting anything**,
   reorganize folders if needed, and report repo size before and after (632 MB on disk today, including
   `node_modules`).

Exit test: CI green on macOS, Windows and Ubuntu with no keys; a fresh clone builds `example`, `example-hf` and
`shots-hf`; `git tag` shows v0.2.0; size report written into STATUS.md.

## Start prompts

Paste into a new chat opened in the repo. Replace `<X>` with the checkpoint letter.

> Read `AGENTS.md`, `docs/plans/phase-9-motion-skills.md`, `docs/archive/plans/STATUS.md` and
> `graphify-out/GRAPH_REPORT.md`. Run checkpoint 9<X> only, on its branch. The research notes are in
> `scratch/phase9/` if they still exist. Write a short spec first and wait for my OK before coding. Keep the core
> free and offline; ask before adding a dependency, vendoring, deleting files, or any paid call. At the end: exit
> test passes, commit, update STATUS.md (Phase 9 row) and run `/graphify --update`.

## Risks

- **Licenses.** Four of the nine repos have no license (1, 2, 7, 8) and one has a non-commercial part (6, ManimGL):
  rewrite from behavior only, copy no text or code. GSAP is under Webflow's own license, which Webflow can amend and
  which is silent on redistribution inside another project: do not bundle it. Remotion's own license is not open
  source: take only math that is standard (spring ODE, interpolation).
- **Secrets leaking.** Keys could reach logs, manifests or error messages. Mitigation: env/git-ignored file only,
  redaction in errors, a test that greps outputs for the key values, never store signed URLs.
- **Provider terms and access changing.** Higgsfield and Adobe can change endpoints, pricing and terms; Firefly API
  access may not be available to an individual at all. The connectors are optional and cached, so films never depend
  on a live service. Higgsfield may train on inputs/outputs; Firefly forbids removing Content Credentials, and our
  video re-encode may drop them (open legal question for the owner).
- **Repo size.** KaTeX adds ~4 MB unpacked (fonts included); handwriting fonts add a little. Generated assets live in
  project folders — large clips should stay git-ignored unless the owner wants them committed.
- **Windows.** New code is Node and browser-side only; no Python/Cairo/LaTeX (the reason Manim CE is not chosen).
  Credentials file path and env vars must work in PowerShell; CI covers Windows.
- **Determinism regressions.** Seeded boil/handheld must key on t, not frame index, or pvk and hyperframes diverge;
  `verify` and the CI frame-diff catch this.

## License notes

| Source | License (verified) | Use in Reelwright |
|---|---|---|
| manim-craft | none | rewrite rules and QA ideas from behavior only |
| remotion-dev/skills | none (Remotion: custom company license) | rewrite standard math only |
| anidoodle | Apache-2.0 | rewrite as SVG; credit in THIRD_PARTY.md |
| motion-design-skill | MIT | rewrite as tokens and docs; credit |
| video-shotcraft (sfgdfgd/-skill fork) | Apache-2.0 (audio Mixkit/untraceable: not taken) | rewrite shots; credit |
| manim_skill | MIT (root, CE); CC BY-NC-SA 4.0 (ManimGL part) | primitive list only; nothing from the ManimGL part |
| cth9191/motion-design | none | rewrite free formats/checklists; prompts not taken |
| claude-skill-motion-graphics | none (README claims MIT; no LICENSE file) | rewrite the CSV importer from the header format |
| gsap-skills | MIT | docs guidance; GSAP library itself is Webflow Standard No Charge license, not bundled |
| KaTeX (candidate) | MIT | vendor only with the owner's OK |
| lottie-web | MIT | not bundled; document only |
