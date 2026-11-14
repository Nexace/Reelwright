# Delivery: gates, ship checks, narration providers, brand, blur, formats (Phase 11, P5)

Everything here is offline and opt-in; none of it runs a paid call. Proof: `node tools/selfcheck/p5-tools.mjs`.

## Gates and ship checks

| What | Command / check | Kind |
|---|---|---|
| Determinism: 16 frames hashed forward, reverse, revisited (cached) and one-page-per-frame (cold) must agree; a film that never changes is refused | `reelwright gate <project>` (`tools/p5-gate.mjs`) | exit 1 |
| Dead air: no whole second in which nothing changes; holds of 2 s or more are reported (`"qa": {"p5-dead-air": {"maxHold": 1}}` tightens) | `gate`, and the qa WARN `p5-dead-air` | exit 1 in `gate`, WARN in qa |
| Reading time and TOO TIGHT captions | qa WARN `p5-readtime` | WARN |
| 9:16 phone zones: text under the top 13 %, bottom 22 % or the right 12 % rail (38 % to 80 % of the height) | qa WARN `p5-safe-zone` (vertical films only) | WARN |
| Facts ledger: `"facts": [{ "claim": "4.8 stars", "source": "App Store, 12 Oct" }]` in project.json; no source, a stale claim, or a data-like number not in the ledger | qa WARN `p5-facts` (opt-in: no `facts`, no output) | WARN |
| Slide-deck rhythm: 4 or more hard cuts, closer than 3.5 s on average,, or cuts at near-equal intervals | qa WARN `p5-motionscan` | WARN |
| A/V sync of the delivered mp4: audio start more than 0.1 s from the video, streams differing by more than 0.15 s, a mix.wav the mp4 does not carry | qa WARN `p5-av-sync` (tools/checks/p5-av-sync.py) | WARN |
| The review ledger: runs the checks above on the film page and the mp4, writes `<project>/ship.json` (mp4 sha256, every check's lines, sign-offs); `--sign "name"` signs off THIS file, and a re-render voids it | `reelwright ship <project> [--sign "name"]` | prints WARNs, exit 1 only without an mp4 |

True peak and loudness are already qa gates; the AAC priming (about 21 ms) sits inside the A/V tolerance.

## Narration providers

`reelwright narrate providers | speak "<text>" [--provider say] [--voice V] [--rate 1] [--yes] | check <wav> "<text>"` (`tools/p5-narrate.mjs`). The film's own voice stays edge-tts
(`tools/vo.py`, which gives the word timings); these are takes you can lay in with `KIT.audio`.

- `say` (macOS, built in), `piper` and `kokoro` (the CLIs, if you installed them; `PIPER_MODEL` names the voice file): local, free.
- `openai`, `gemini`, `elevenlabs`: cloud and paid; refused without `--yes`, the character count is printed first, the API key comes from `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`. Their
  request shapes follow each vendor's documented REST API and are tested against an injected `fetch`, **not** against the live service: run one short line before trusting a long script.
- A take is a 24 kHz mono wav at `assets/narration/<sha1 of provider, voice, rate and text>.wav`: the same text in the same voice is never spoken twice.
- `check` transcribes a take with whisper.cpp (`whisper-cli`, a ggml model in `WHISPER_MODEL`) and fails when more than `--max-wer` (0.1) of the words did not come back, naming the missing ones.
  The adapters for piper, kokoro and whisper-cli are proven against stub executables on PATH (their arguments, stdin and files), not against the real models, which this repo does not install.

## Brand

`reelwright brand <project> inventory | check` (`tools/p5-brand.mjs`): every logo in `assets/`, `brand/` (files named `*logo*`, `*mark*`, `*wordmark*`, `*icon*`, `*brand*`) and `brand.json` `logos: [{ file, role }]`, with format, size, alpha and role (wordmark wider than 2.2:1, icon near square). The check fails on an invalid palette colour, ink on bg under 4.5:1, a listed logo that is not on disk, a raster logo under 256 px (128 for an icon), a logo without transparency, an svg without a viewBox. A Figma sheet comes in through `tools/figma_export.py` (token and network, as before).

## Motion blur in linear light

`tools/p5-blur.mjs`: `linearBlurFilter(samples, { alpha })` and `averageFrames(pattern, samples, out)` decode sRGB to linear at 16 bit, average there, encode back. A white box over black averages to 186, not the 127 the gamma-space `tmix`
gives (proved by `p5-tools.mjs`); with alpha the colour is premultiplied in linear light. `blurSpec(P, flag)` reads `project.json motionBlur` or `--blur auto|N` (`auto` = shutter 180, 8 samples, linear).
**It is not wired into the renderer yet**: pvk.mjs and bin/reelwright.mjs are shared files; the patch is in the P5 report.

## Formats

`tools/p5-formats.mjs`: `sizeOf` / `parseFormats` take the five named shapes and any `WxH` with both sides even (H.264) and 16 to 8192. The encodes of `tools/renderers/pvk.mjs` are proved for mp4 (a 1200x628 frame stays 1200x628), gif, webm (VP9), apng, and alpha webm / apng / gif keep a transparent corner. **Not wired into `--formats` yet**: it is a shared patch in the P5 report.
