# Phase 6 spec: film from a URL, style from a reference

Branch `phase-6-url-reference`. Status: approved 2026-11-01 (go ahead given with the task); built.

Both commands are plain CLI, free and local: Playwright reads the page, rules and templates write the script, no AI
service or key. Only capture sites you own or have the right to use; the help text says so.

## 6a. `reelwright from-url <url> [name] [--yes]`

**Capture.** `tools/capture_site.mjs` keeps its CLI and gains an exported `capture(url, out, opts)` that also reads
the page's facts into `site.json`: title, description, site name, headings (level, text, the paragraph under it,
page position), call-to-action buttons, colours (background by sampling what is on top on a grid over the first two
screens, text colour weighted by text length, accent from saturated button/link colours), fonts (display = headings,
text = paragraphs, mono = code; first family and weight) and button radius. Screenshots: `hero.jpg` (first screen)
and one shot per h2/h3 heading. Every request other than GET/HEAD is answered with a fake 200 and never reaches the
site; nothing is clicked or typed.

**Script draft (rules, not AI).** `tools/from_url.mjs` picks: `hook` = the h1 (else og:title, else the title's
first part); `what` = the meta description's first sentence (else the first long paragraph); `f1`–`f3` = the first
three h2/h3 headings of 2–9 words that aren't navigation ("FAQ", "Blog", "Sponsors"…), each with the first sentence
under it; `cta` = the first short hero button + host ("Get started at vite.dev."), else "Visit <host>.".
Text with a data-like number (40 %, $12, 3×, 1,200, 4.8) is skipped: those are the site's claims, not checked here,
and the illustrative gate would want a label on them.

**Project.** `projects/<name>/` (name defaults from the host): HyperFrames renderer, `project.json` (lines, `source`
url, `"style"` = clean for a light site, dark-tech for a dark one), `brand.json` (the site's colours and nearest
bundled fonts, from 6b), `hf/index.html` + `hf/film.js` copied from `tools/from_url/` (kinetic hook → tilted hero
shot → one split per feature with its shot → full-bleed CTA; captions on every line but the hook; all timing from
`V/W/snap`), `hf/site.js` + `hf/site/*.jpg`.

**Approval.** Without `--yes` it prints the drafted lines and stops: edit `project.json`, then `reelwright all
<name>` builds and runs the QA gates (non-zero exit and the gate's time/frame on failure, as today). `--yes` builds
straight away. An existing project is never overwritten.

## 6b. `reelwright theme-from <url|image> [name]`

URL: the same capture (facts only). Image (.png/.jpg/.jpeg/.webp): colours from a pixel histogram in the browser
(background = commonest colour, ink = the dominant colour that contrasts most, accent = the most saturated colour
with real coverage); fonts can't be read from pixels, so they keep the base theme's.

Fonts: a family that's bundled is used as is; otherwise a name table maps it to the nearest bundled OFL family
(Helvetica/system → Inter, Futura/Poppins → Montserrat, Georgia → Source Serif 4, Menlo → JetBrains Mono …), else
the stack's generic (serif / monospace / sans). The display weight is the bundled weight closest to the site's.

Output `themes/<name>.css`: the base theme's file (clean or dark-tech, by background lightness) plus a `:root`
block of drafted tokens — `bg` (and `bg-image: none`), `ink`, `muted`, `accent`, `accent-2`, `on-accent`, `surface`,
fonts, display weight, radius, caption colours — with a header naming the source and each font mapping. Contrast is
enforced: ink ≥ 4.5 on bg (else black/white), the spoken caption colour ≥ 4.5 on the caption box (accent if it
passes, else ink). Select with `"style": "<name>"`.

## Exit test

- `from-url` on a real open-source landing page: script approved as drafted, `all` gives an mp4 that passes every
  QA gate with no other edit.
- `theme-from` on a real landing page: the theme's colours and fonts recognizably match the page (stills beside a
  screenshot); `example-hf --style <it>` builds and passes QA.
- `theme-from` on an image writes a valid theme.
- `example` (pvk) still 1378 frames, 22.952 s.

## Not in this phase

AI-written scripts, crawling more than one page, logging in, recording interactions on the site (mocked writes only
matter once a take clicks), reading fonts from images (OCR), checking the site's numeric claims.
