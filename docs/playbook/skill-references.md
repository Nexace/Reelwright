# Skill references: the product-video skill, split by topic

`.claude/skills/product-video/SKILL.md` stays short (commands, workflow, rules). The detail lives in these references; the skill points at them, so an agent loads only the topic it is working on. Two small companion skills cover the CLI and the registry:
`.claude/skills/reelwright-cli/SKILL.md` (every command, `--json`, exit codes) and `.claude/skills/reelwright-registry/SKILL.md` (`catalog`, `add`, blocks, caption styles).

| Reference | Read it when | Where it lives |
|---|---|---|
| film | planning scenes, the edit, timing rules | docs/PLAYBOOK.md (Process, Timing), docs/recipes/README.md (shared setup and 8 scene recipes), docs/playbook/nested-compositions.md |
| captions | karaoke subtitles, caption components, safe area | `KIT.subtitles`, `reelwright captions <name> <caption-component>`, `catalog --tag caption-style`, `check --caption-zone` |
| overlays | lower thirds, callouts, end cards, blocks over footage | docs/playbook/blocks.md, `catalog --tag lower-third`, docs/recipes/end-card.md |
| motion | easing, springs, camera moves, stagger | docs/playbook/motion.md, docs/playbook/motion-blur.md, `KIT.shot.*`, docs/recipes/push-in.md |
| look | themes, grading, effects | docs/playbook/themes.md, theme-brief.md, grading-effects.md, `theme-brief`, `theme-from`, `remix` |
| sound | voice, music, beat grid, loudness, limiter | docs/playbook/sound.md, `beatgrid`, `audio-report`, docs/playbook/video-audio.md |
| story | audience, script, the one thing to remember | AGENTS.md workflow, docs/playbook/claude-workflow.md, docs/recipes/faceless-explainer.md |
| storyboard | beat sheet and spreadsheet script | `beats import/export`, PLAYBOOK Process |
| review | stills, taste, QA, layout audit | `stills`, `node tools/checks/taste.page.mjs`, `qa`, `check`, docs/playbook/qa-lint.md |
| format | sizes, extra outputs, quality, languages | docs/playbook/output-formats.md, `--formats`, `--as`, `--lang` |
| runtimes | GSAP, Lottie, three, anime, d3, math, doodle | docs/playbook/runtimes.md, math2.md, doodle.md, manim.md, remotion.md |
| types (video kinds) | launch film, explainer, music video, data film, vertical | docs/recipes/ (hook-title, faceless-explainer, lyric-video, pr-to-video, chart-grows), docs/playbook/prompting-*.md |

## Prompting pages

docs/playbook/prompting-data-maps.md, prompting-recreate-reference.md, prompting-editing-existing.md: ready-to-paste prompts with the commands and checks.

## CLI skill

Short form of `reelwright-cli`: `reelwright json <command> ...` wraps any command in one JSON envelope (`ok`, `exit`, `stdout`, `data`, `_meta`, `did_you_mean`; exit 0, 1 failed, 2 usage). `doctor` checks the machine, `browser ensure` the headless browser, `compositions` lists a project's compositions, `docs <topic>` prints a playbook page, `check` audits layout and occlusion before rendering, `audio-report <file>` gives onsets, sections and tempo.

## Registry skill

Short form of `reelwright-registry`: `catalog [words] [--type block|component] [--tag t] [--json]` searches the vendored HyperFrames items; `add <name>` installs one (a component to `hf/blocks/` for `KIT.block`, a block to `hf/compositions/` for `KIT.mount`); `captions <name> caption-pill-karaoke` feeds a caption component from the film's VO words.
