# Phase 7 spec: free cloud rendering

Branch `phase-7-cloud`. Status: spec approved 2026-11-01 (token from Colab Secrets; real-Colab run by the user); built.

## 7a. Colab notebook: `cloud/reelwright_colab.ipynb`

One settings cell (project name, extra build args like `--style editorial`, Drive folder names), then cells that
are safe to re-run top to bottom:

1. **Drive.** Mounts Drive in Colab. Outside Colab (CI, a local Jupyter) it uses `REELWRIGHT_DRIVE` or `./drive`,
   so the same notebook is testable without Google.
2. **Code.** `git clone` of this repo into `/content/reelwright` (local disk, fast). While the repo is private the
   clone reads a GitHub token from Colab Secrets (`GITHUB_TOKEN`, a read-only fine-grained token you create; it never
   appears in the notebook or its output). Once Phase 8 makes the repo public, no token.
3. **Tools, cached in Drive** (`MyDrive/reelwright/cache/`): Node 22 tarball, the Playwright browser folder as a
   tarball (unpacked to local disk: Drive's FUSE mount can't run executables reliably), pip and npm caches. First run
   downloads (~5 min); later runs unpack (~1 min). ffmpeg and Python come with Colab; Chromium's system libraries
   via `playwright install-deps` (Colab runs as root).
4. **Project.** Copies `MyDrive/reelwright/projects/<name>/` to `/content/reelwright/projects/<name>/`. You put your
   project there (Drive web upload or Drive for desktop). The bundled projects (`example`, `example-hf`, …) need no copy.
5. **Build with resume.** Runs the `all` steps one at a time and copies the project back to Drive after each
   step, including `.cache/frames/` and `vo/`. A rerun after a disconnect skips what's on disk:
   `record` when `clips/` and `film/clip.js` exist (re-recording would change every frame), `vo` by its own line
   cache, pvk frames by the Phase 5 frame cache. Cheap steps (sched, info, music, mix) just rerun. HyperFrames
   films re-render all frames on resume (the producer has no frame cache; they are short).
6. **Result.** The mp4, `.srt`, `.vtt`, `.manifest.json` and the qa report land in `MyDrive/reelwright/projects/<name>/out/`.

Step 0 of the build (and of CI, below): a smoke test that Playwright's Chromium and the vendored HyperFrames
producer each render one frame, so a broken browser fails in seconds with a clear message.

## 7b. GitHub Actions fallback: `.github/workflows/render.yml`

`workflow_dispatch` with inputs `project` (default `example`) and `args` (e.g. `--style neon --lang es`):
same install as CI, `reelwright all <project> <args>`, uploads `out/` as an artifact. Only renders projects
committed to the repo. Docs state the limit: private repos get 2,000 free Linux minutes a month on GitHub Free (the
example takes ~10), public repos are free. Also runs on a push that changes the workflow file itself, so the
branch can test it before merge (dispatch needs the file on `main`).

## Checks

- CI job `colab-notebook` on `ubuntu-22.04` (Colab's OS) executes the notebook with `nbconvert`, `REELWRIGHT_DRIVE`
  set to a temp folder: the example mp4 must appear in the fake Drive; then a second run must skip `record`, reuse
  the VO and take frames from the cache (asserted from its log), and give the same frame hashes (`verify`).
- `render.yml` runs once on the branch and its artifact holds the example mp4.
- **Real Colab (you):** I can't sign in to Google from here. You open the notebook in Colab (link in the README),
  set the token secret, run all; the example mp4 appears in your Drive. Then disconnect mid-render and rerun to
  see resume. You paste the last cell's output back to me and I record it in STATUS.

## Docs

README "Render in the cloud" section: Colab steps with screenshots-free instructions, the token, Drive layout,
limits (Colab disconnects after idle time or a few hours; Google sets the free limits and GPU isn't needed), and the
Actions fallback. HyperFrames' AWS Lambda rendering stays out (paid).

## Not in this phase

Paid clouds, GPU rendering, a `reelwright cloud` command that uploads for you (Drive's API needs OAuth setup).

## Decisions I need from you

1. Clone with a read-only GitHub token from Colab Secrets while the repo is private (my default), or keep a copy of
   the code in Drive instead (no token, but you re-upload after each change)?
2. OK that the real-Colab exit check is a run you do and paste back to me?
