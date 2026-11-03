# Phase 9e task plan — release docs and version

Spec: docs/plans/phase-9-motion-skills.md section "9e — Release and cleanup" (approved 2026-11-02). Cleanup is done by
the controller with the owner's approval, not in this task.

## Global Constraints

- Repo <local path> Project/reelwright, branch `phase-9e-release`. Read AGENTS.md.
- Docs only describe what the code does: check every command, flag, API name and default against the code
  (bin/reelwright.mjs help text, tools/*.js headers, tools/gen/*). No claims about providers beyond docs/CONNECTORS.md.
- The core is free, local and offline; the Higgsfield connector is optional and off by default; Firefly and Adobe
  Express are manual import only. Say so plainly.
- No code changes except version metadata. No new dependencies. Never commit generated or scratch files.

## Task 1: Release docs and version 0.2.0

Files: README.md, AGENTS.md, docs/PLAYBOOK.md (consistency pass only), .claude/skills/product-video/SKILL.md,
THIRD_PARTY.md and NOTICE (completeness check), package.json + package-lock.json (`"version": "0.2.0"` — the
top-level and the root package entry in the lock), docs/plans/phase-9-motion-skills.md (status line: built through 9e).

1. README:
   - "Every command" table: add `beats` and `gen` rows exactly matching bin/reelwright.mjs's help; check every other
     row still matches.
   - A short "What's new in 0.2" section (or extend the existing feature overview): motion vocabulary (KIT.easing,
     bezier, spring, keys, stagger, per-theme motion tokens), named camera shots (KIT.shot.*), doodle theme
     (KIT.doodle), math and equations (KIT.math, vendored KaTeX), beat-sheet import/export, QA WARN checks, optional
     generation connector.
   - A "Connectors (optional)" section: Higgsfield connector off by default, needs keys and a paid balance, shows a cost
     estimate and asks first, results cached so films rebuild offline; Firefly and Express are manual import via
     `gen --import`; link docs/CONNECTORS.md. Then an explicit "Works without any connector" list (every core command).
   - Theme count and list match themes/ (11 with doodle); example films list includes shots-hf and math-hf if the
     README lists example projects.
2. AGENTS.md: the workflow mentions the new tools where an agent would pick them (shots, doodle, math, beats import as
   a way to start a script; gen only when the owner asks, never a paid call without asking; AI label rule next to the
   "Illustrative data" rule).
3. .claude/skills/product-video/SKILL.md: same additions, matching AGENTS.md (it's the Claude-specific copy; keep its
   format).
4. docs/PLAYBOOK.md: consistency pass — section order sensible, no duplicate or contradicting statements between the
   Motion, Camera shots, Doodle, Math, GSAP, Lottie, Beat sheets and QA paragraphs; fix only what's wrong.
5. THIRD_PARTY.md / NOTICE: every shipped third-party item present (KaTeX, Caveat, Patrick Hand, fonts list, HyperFrames)
   and every reference credit from Phase 9 present (motion-design-skill, gsap-skills, Remotion skills maths,
   video-shotcraft, anidoodle, manim-craft, manim_skill, cth9191/motion-design, docusphere); fix gaps.
6. package.json and package-lock.json: add `"version": "0.2.0"` (lock: top-level `version` and `packages[""].version`);
   `npm install --package-lock-only` is acceptable if it changes nothing else — otherwise edit by hand.

Done when: every command and API name in the touched docs exists in the code (report how you checked); `node
bin/reelwright.mjs` help output matches the README table; `node tools/motion-check.mjs`, `node tools/beats.mjs
--self-check` and `node tools/gen/test.mjs` still pass; no code files changed except package.json/lock.
