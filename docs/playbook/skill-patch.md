# Patch for the shared skill file

Append to `.claude/skills/product-video/SKILL.md` (shared file, so applied by the orchestrator), after the "Craft beyond the layouts" paragraph:

```md
## References (load the one you need)

docs/playbook/skill-references.md maps each topic (film, captions, overlays, motion, look, sound, story, storyboard, review, format, runtimes) to its page and commands. Prompts for data and maps, recreating a reference and editing existing footage: docs/playbook/prompting-*.md. Extra recipes: docs/recipes/pr-to-video.md, lyric-video.md, faceless-explainer.md. New commands: `catalog`, `captions`, `check`, `doctor`, `browser`, `compositions`, `docs`, `audio-report`, `json` (skills `reelwright-cli` and `reelwright-registry`).
```

Also add three rows to `docs/recipes/README.md`'s table (shared index): `pr-to-video.md`, `lyric-video.md`, `faceless-explainer.md`.
