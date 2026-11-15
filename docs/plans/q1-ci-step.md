# Q1: CI step for the offline voiced film

Add to `.github/workflows/ci.yml`, job `build-example`. Linux needs a speech engine; macOS (`say`) and Windows (SAPI) have one built in.

1. In the "Install ffmpeg" step, add `espeak-ng` on Linux:

```yaml
            Linux) sudo apt-get update -q && sudo apt-get install -yq ffmpeg espeak-ng ;;
```

2. After "Build the example film end to end" (and its "Duration and frame count" step), add. It rebuilds `projects/example` with the OS voice, so
   put it after the steps that use the example's edge-tts build (the repeatability step and the artifact upload read `projects/example/out`):

```yaml
      - name: "Offline voiced film: the example built with the OS voice (no network), qa, audio, duration and frame count"
        env: { PAGES: 2, PYTHON: python }
        run: node tools/ci_film.mjs | tee -a "$GITHUB_STEP_SUMMARY"
```

`tools/ci_film.mjs` exits 0 with a `SKIP` line when the machine has no engine, so a runner image that drops its engine does not turn the job red
by itself; the line in the summary shows it. To make a missing engine a failure on the three CI runners, add `REELWRIGHT_REQUIRE_TTS: 1` to
`env` (read by `ci_film.mjs`).
