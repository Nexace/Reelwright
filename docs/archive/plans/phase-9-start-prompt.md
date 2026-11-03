# Phase 9 start prompt

Paste everything inside the block below into a new chat opened in this folder. It writes the Phase 9 plan only (`docs/plans/phase-9-motion-skills.md`); nothing is built until you approve that plan.

```
<context>
Repo: Reelwright (video toolkit; HyperFrames vendored; Phases 1-8 are done and released as v0.1.x). Read first: AGENTS.md, README.md, docs/PLAYBOOK.md, graphify-out/GRAPH_REPORT.md, and the archived plan in docs/archive/plans/.
Project rules that still hold: standalone toolkit (no MCP server or Claude plugin); native on macOS and Windows with no WSL; Reelwright stays MIT; vendored third-party code keeps its license plus a NOTICE and VENDORED.md entry; test and scratch files go in a git-ignored scratch/ folder.
Rule change for Phase 9 (decided by the owner): the CORE stays free and local, and every core command MUST work with no account, key or network beyond what exists today. Paid services are allowed ONLY as optional, opt-in connectors that are off by default.
The nine repos to cover:
1 albertobarnabo/manim-craft
2 remotion-dev/skills
3 alexgreensh/anidoodle
4 LottieFiles/motion-design-skill
5 sfgdfgd/-skill (video-shotcraft)
6 adithya-s-k/manim_skill
7 cth9191/motion-design (Higgsfield workflow)
8 docusphere/claude-skill-motion-graphics
9 greensock/gsap-skills
Optional connectors requested: Higgsfield and Adobe Firefly (the owner has a Creative Cloud Pro subscription). Adobe Express is covered as manual import only.
</context>

<task>
Write the plan for Phase 9. PLAN ONLY: do not implement anything and do not edit tools/, themes/, vendor/, bin/ or any code.

1. Approach is REVERSE ENGINEERING of the nine open-source repos, but ONLY for what Reelwright cannot do today. First read each repo's README and LICENSE (`gh api repos/<owner>/<repo>/readme` and `/license`) and compare with what Reelwright already has (check the code, not memory). Mark each feature "already covered", "gap" or "out of scope", and skip the deep study for covered features. For every gap, study the repo's actual source (clone it into scratch/, or read files via `gh api`). Document how it really works: structure, key algorithms, data formats, the techniques behind its best results. Then plan a native Reelwright implementation of the useful parts. Where the license allows copying (MIT, Apache 2.0), say per file whether to vendor it (license, NOTICE, VENDORED.md) or rewrite it. Where it does not (GPL, AGPL, unclear), rewrite from the documented behavior only. Record only what you verified; mark anything you could not check as unverified.
2. Write `docs/plans/phase-9-motion-skills.md` with one coverage table, one row per repo (all nine): what it offers, what Reelwright already has, license, approach (adopt as docs / re-implement natively / vendor optionally / optional connector), effort (S/M/L), checkpoint.
3. Hard cases:
   - Repos 1 and 6 (Manim): compare (a) native math primitives in the engine and (b) Manim CE as an optional third renderer. Recommend one using cross-platform install size, the determinism rule (render(t) is a pure function of t) and license.
   - Repos 7 and 8 (Higgsfield-based): the free parts come first (style library as themes or presets, beat-sheet CSV import). The paid generation goes through the optional connector below. State plainly what works only with the connector.
4. Design the optional connectors checkpoint (Higgsfield and Adobe Firefly):
   - One command shape, e.g. `reelwright gen --provider firefly|higgsfield "<prompt>" --out projects/<name>/assets/...`, with a small provider interface so more providers can be added later.
   - Credentials come only from environment variables or a git-ignored local file. Never stored in the repo, project.json, logs or generated manifests. A missing key gives a clear message and changes nothing else.
   - Every generated asset is saved as a normal file plus a manifest entry (provider, prompt, date, no secrets) and is cached by content, so a film rebuilds the same without calling the service again and works offline afterwards.
   - Generated assets get an "AI-generated" label option in the film.
   - Verify what access each provider actually offers (Higgsfield CLI plan requirements; whether Firefly API access is included in Creative Cloud Pro or is a separate Firefly Services product) from official docs. Mark unverified claims and do not guess prices.
   - Adobe Express: manual workflow only (export png/mp4 and drop into assets). Document it, no connector.
   - CI MUST pass with no keys; connectors are tested with mocked responses only. Never make a real paid call without asking the owner.
5. Structure the phase as checkpoints (9a, 9b, 9c, 9d), each with a branch name, files touched, a command-verifiable exit test and a start prompt for a new chat. Include: easing and timing presets per theme, a named shot library, a doodle theme with a draw-on stroke, the Manim decision, the connectors, a GSAP section in docs/PLAYBOOK.md.
6. Final checkpoint (release): update README (new commands, connectors marked optional, what works without them), AGENTS.md, docs/PLAYBOOK.md, .claude/skills/product-video/SKILL.md, THIRD_PARTY.md and NOTICE; bump the version and tag. Then a cleanup step that lists unneeded files with sizes, WAITS for approval before deleting, reorganizes folders neatly, and reports repo size before and after.
7. Add a Risks section (licenses, secrets leaking, provider terms changing, repo size, Windows) and a license notes section. Add a Phase 9 row to the Progress table in STATUS.md (find where it lives).
</task>

<constraints>
- Only create or edit files under docs/ and commit them; change nothing else.
- Stop and ask before: adding any dependency, deleting any file, vendoring code, creating an account, or any call that uses paid credits.
- Reverse engineering applies to the open-source repos only. For Higgsfield and Adobe Firefly use official docs and documented APIs only: no decompiling, no bypassing authentication or limits, no extracting private prompts or models.
- Every claim about a repo or provider comes from what you read; do not guess features or prices.
- Do not add features beyond the nine repos and the two named connectors.
</constraints>

<output_format>
Finish with: the path of the plan, the coverage table, any repo you could not fully cover and why, and the commit hash. Then run /graphify --update.
</output_format>
```
