# PR to video

A 30 to 45 second film of one pull request: what changed, why, and how big it was. The facts come from the GitHub API, the film is a normal HyperFrames film, and nothing is ever written back to GitHub.

## When to use

- A release note, a changelog video, a "what shipped this week" clip made from merged PRs.
- Not for private repos you cannot share on screen: the title, file names and diff lines are rendered into the film.

## 1. Fetch the facts (read-only)

```bash
gh api repos/OWNER/REPO/pulls/123 --jq '{title, body, user: .user.login, additions, deletions, changed_files, merged_at}' > pr.json
gh api repos/OWNER/REPO/pulls/123/files --jq '[.[] | {filename, additions, deletions, patch}]' > pr-files.json
```

Only `GET` calls: never `gh pr merge`, `gh pr comment` or any `-X POST/PATCH`. (AGENTS.md: a film never performs a real write.)

## 2. Write the lines first

Four to six lines, from the PR title and body, shown to the user before building. Put them in `projects/<name>/project.json`:

```json
"lines": [
  { "id": "what",  "gap": 0.0, "text": "Search now ranks by recency." },
  { "id": "why",   "gap": 0.7, "text": "Old results were burying the new ones." },
  { "id": "size",  "gap": 0.7, "text": "Forty files changed, mostly deletions." },
  { "id": "ship",  "gap": 0.7, "text": "Merged Tuesday." }
]
```

Create the project with `./video.sh new pr-123 --renderer hyperframes`, then `./video.sh audio pr-123`.

## 3. The scenes

| Scene | Layout | Data |
|---|---|---|
| title | `KIT.layout.kinetic({ line: 'what', ...span })` | PR title |
| diff | a hand-built card: the first 6 `+`/`-` lines of the most changed file in `pr-files.json`, green and red rows entering with `KIT.stagger` | `patch` |
| size | `KIT.layout.stat({ value: additions + deletions, label: 'lines changed' })` | `additions`, `deletions` |
| end | wordmark or repo name | `OWNER/REPO` |

Real numbers from the API need no "Illustrative data" label. Anything you round, invent or rank does.

```js
const pr = await (await fetch('assets/pr.json')).json();   // copy pr.json into projects/<name>/hf/assets/ first
const rows = patchLines.slice(0, 6).map((l, i) => el('div', `diff ${l[0] === '+' ? 'add' : 'del'}`, card, l));
// in render(t): rows.forEach((r, i) => { const p = ent(t, diffStart + i * KIT.staggerStep); r.style.opacity = p; });
```

Time every scene from `V('what').start`, `W(...)` and `KIT.snap()`, not from seconds.

## Checks

- `./video.sh stills pr-123`, read `stills/sheet.jpg`: the diff rows must be readable at 1080 wide (44 px minimum for supporting text, PLAYBOOK).
- `node bin/reelwright.mjs check pr-123` for text running off the frame (long file paths do).
- Patch text can contain `<`: set it with `textContent`, never `innerHTML`.

[Back to the index](README.md)
