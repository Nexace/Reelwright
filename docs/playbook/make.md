# `reelwright make`: the guided start

`reelwright make "<brief>"` turns one sentence into a ready project. It is deterministic and offline: no AI service, no key, no render, no paid call and no download. Without `--yes` it only prints the plan.

```
reelwright make "<brief>" [--name n] [--audience a] [--length s] [--voice|--music-only] [--url u] [--folder f] [--yes]
```

## What it decides

The first rule that matches wins, and the plan shows which word matched.

| The brief has | It runs | Voice by default |
|---|---|---|
| a URL, or `--url` | `from-url <url> <name>` | drafted from the page |
| a folder, or `--folder` | `slideshow <folder> <name>` | music only |
| promo, launch, teaser, trailer | `promo <name>` (Ink Press, a fixed 36 s) | music only |
| explainer, motion, graphics, animation | `new <name> --renderer hyperframes --agents` | voiceover |
| walkthrough, demo, tutorial, app | `new <name> --agents` (record.mjs and film/film.js) | voiceover |
| none of these | the explainer, because it needs no recording | voiceover |

The theme comes from `theme-brief`'s matcher (the brief against 192 product types). For the `new` starters it writes `themes/<name>.css` and sets `"style"`; the promo, the slideshow and `from-url` keep their own look, and the plan prints the `theme-brief` command that would draft one.

## The script

- Put your own lines in the brief after `script:` (or `voiceover:`, `vo:`), or inside "double quotes". They are split into sentences, one voiceover line each. CRLF is fine.
- Otherwise it drafts placeholders at about 2.5 spoken words per second: roughly one line per 5.5 s of the `--length` (default 30 s), a hook first and a close last. Every placeholder starts with `[DRAFT n/N role]`, so none can pass for copy. Replace them before `audio`.
- `--music-only` (or "music only" in the brief) writes no lines; `--length` becomes the tail. The promo and the slideshow are always music only.

## Steps

1. `reelwright make "Launch promo for Acme budgeting app"` prints the renderer, theme, template, number of lines, expected duration and the exact commands. It ends with `dry run: re-run with --yes to create projects/<name>`.
2. Re-run with `--yes`. It creates `projects/<name>` with the existing commands, writes `AGENTS.md` and `CLAUDE.md` into it, edits `project.json` (title, out, brief, lines, style) and prints the next three commands: `sched`, `stills`, `all`. A failed step removes what it made.
3. Edit the lines (`project.json`), run `audio` (the voiceover needs the internet), then `sched` and `stills`, and read `stills/sheet.jpg`.

It refuses, creating nothing, on an empty brief, an unknown flag, `--voice` with `--music-only`, a bad `--length`, a missing or empty folder, a bad `--url`, and a name that already exists (`--name` picks another). `from-url --yes` loads the one page you name; capture only sites you own or may use.

`node tools/selfcheck/make.mjs` checks the routing, the dry run, `--yes` and the refusals.
