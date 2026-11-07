## Working with Claude: brief → script → stills → taste → preview → render

The loop an agent (Claude Code, the desktop app, Codex, …) runs for a film. Each step is cheap until the last.

1. **Brief.** Audience, length, voice or music-only, the one thing the viewer must remember, what must be shown.
   Write it at the top of `project.json` as `"brief"` (any text; nothing reads it but people and agents).
2. **Script.** The VO lines in `project.json` → `lines`. Show them to the owner before building anything.
3. **Stills.** `./video.sh audio <name>` (voiceover timings; needs internet), then `./video.sh stills <name>` and read `stills/sheet.jpg` yourself. Start
   scenes from [docs/recipes/](../recipes/README.md): proven patterns with a still each, so the first draft already
   looks finished.
4. **Taste.** `node tools/checks/taste.page.mjs projects/<name>` (seconds, no render). It prints WARN lines:
   - `motion` — a one-frame velocity spike (a jump or jitter) or a move that starts/stops dead at speed (no easing);
   - `balance` — content piled to one side of the frame for over a second;
   - `empty` — a near-empty frame for over 1.5 s, or a frame crammed edge to edge;
   - `contrast` — text below WCAG 4.5 (3 for large text) against what's behind it;
   - `pacing` — a VO line faster than 3.3 words/s, or over 4 s where nothing moves.
   They never fail the build (qa prints them as `WARN taste:` too); fix them or say why the shot wants it.
5. **Preview in the chat.** `./video.sh embed <name>` writes `projects/<name>/out/embed.html`: one self-contained page
   (film, kit, fonts, images, blocks, mix) in the vendored HyperFrames player. No server, no network (its own CSP
   forbids it), so it plays from file://, in the desktop app's side panel (send the file to the user with
   `display: "render"`), or as a private claude.ai artifact (publish the file; ≤ 16 MB, raster frames are halved
   automatically when a recording would be bigger). Add `#12.5` to open paused on a moment. Re-run after every edit.
6. **Render.** `./video.sh all <name>` in the background, then fix every QA FAIL and look at every WARN.

`./video.sh preview <name>` is still the scrubber with the waveform and hot reload for a person at the keyboard; `embed`
is the one to hand over.
