# Phase 6 spec: film from a URL, style from a reference

Branch `phase-6-url-reference`. Status: approved 2026-11-01 (go ahead given with the task); built. Exit test passed locally on macOS; CI green on macOS, Windows, Ubuntu (run 41251725840); merged to main 2026-11-01.

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

## As built (differences from the plan above)

- Ink is the highest-contrast of the four commonest readable (≥ 4.5) text colours, not simply the commonest: on
  vite.dev grey body copy outweighs the white headings, and the theme's `ink` is the heading colour (`muted` gets the
  body grey). Images use the same rule over their pixel histogram.
- Read-only is per browser context, not per page (review fix): writes from popups and workers get the fake 200 too,
  service workers are blocked, WebSockets are closed before they connect, `window.open` returns null and any other
  new page is closed at once, `navigator.sendBeacon` is a no-op, and only http(s)/file URLs are loaded. Checked with
  a local server that logs methods (`scratch/probe/`): an unprotected page sent POST/PUT from a service worker, a
  popup form, a `_blank` form, sendBeacon, fetch and XHR plus a WebSocket upgrade; `from-url` and `theme-from` on
  the same page logged only `GET /`.
- The capture goes to a temp dir; the project is created only after it succeeds. An HTTP error (404, 403, a 503
  challenge) stops the capture; `file://` has no response status. Pages that never reach network idle are captured
  after 20 s plus 3 s. The final URL after redirects, without query or fragment, is what the project records.
  Fewer than 3 drafted lines prints a warning.
- Font names from the page are used only if they're plain (`[\w ]+`) and a folder in `fonts/`; page text written
  into a theme's comments can't close them. `on-accent` is checked for 4.5 contrast on the accent.
- Saturation is chroma ((max − min) / 255), so near-black text like #010000 doesn't count as an accent.
- `file://` pages work too (`from-url`, `theme-from`), so CI drafts a project and a theme from
  `projects/website/site/` offline on all three OSes. With no host, the site's name stands in: the CTA reads
  "Start free with Tidy.", the credit "Source: Tidy", the project title "Tidy".
- The heading shots are one viewport (1440×900 @2×) scrolled to each h2/h3; `from-url` keeps only the hero and the
  shots the draft uses. `site.json` stays in `hf/site/` for reference.
- Numbers inside screenshots: the capture stores the DOM text visible in each shot (`heroText`, `shotText` in
  `site.json`); the film puts it on the `<img data-qa-text>`, and `tools/qa_page.mjs` (generic, every film) checks
  visible images' `data-qa-text` like visible text, except that a visible "Source: …" credit also passes for them.
  `from-url` lists the numbers at the approval stop and the scene shows "Source: <host>" (a layout `note`) while such
  a shot is up. Version numbers (v8.3.4, 3.10.2, v1.4) no longer count as data, in the drafting and in the gate.
  Checked: qa-broken still fails the gate ("40%" in text); the demo-site film passes with credits and fails 28
  times (e.g. 6.5 s "40%" in a screenshot) with the credits switched off.
- The film opens on the site's name, which crossfades into the hook's first word (`KIT.align('hook')[0]`), so there
  is no blank opening; `qa` reports no near-blank stretch at the start.
- Drafting rules, tuned on nine open-source landing pages (vite.dev, svelte.dev, astro.build, tailwindcss.com,
  bun.sh, docusaurus.io, vitest.dev, 11ty.dev, pnpm.io; captures only, no render except docusaurus): name from
  og:title's first part, og:site_name, the title's first or last part; hook = the whole h1 if it fits (pnpm's three
  short sentences), first letter capitalised, ALL CAPS made sentence case; what = a "<Name> is …" sentence, else the
  description, else "<Name> has/helps/lets …" (not "has been", a testimonial); body copy must start with a capital
  (drops "replaces npm · yarn"); too-long sentences are cut at a comma or dash if ≥ 8 words remain; headings like
  "Supported by", "Built with", "Showcase", "Browse", "Don't take our word" are skipped; % $ × stay in the text so the
  number check sees them ("Up to 42× faster" was slipping through); CTA prefers Get started / Install / Try, and a
  one-word button gets the name ("Install Bun at bun.sh."). Every line ≤ 25 words.

**Exit test (macOS, 2026-11-01).** `from-url https://vite.dev` (Vite's site source is MIT-licensed in the
vitejs/vite repo, so filming it for a test is allowed), script approved as drafted, then `all vite-dev`: 839 frames,
27.93 s, all five gates PASS (−14.0 LUFS, peak −1.4 dBTP). `theme-from https://vite.dev vite`: bg #16171d, ink
#ffffff, muted #867e8e, accent #b39aff (Vite's lilac), Inter → Inter, "APK Protocol" → Inter Tight 700,
"KH Teka Mono" → JetBrains Mono; `film example-hf --style vite` 337 frames, 11.221 s, all gates PASS.
`theme-from` on a screenshot: accent #6a13e4 (Vite's violet), white ink. `from-url <file:// demo site> --yes`
(light site, clean base): 676 frames, 22.5 s, all gates PASS. `example` (pvk) 1378 frames, 22.952 s. The test
projects and the vite theme stay out of the repo (kept in `scratch/`).

**Second round (2026-11-01).** `from-url https://docusaurus.io docusaurus --yes` (MIT, site source in
facebook/docusaurus), drafted script used as is: 812 frames, 27.03 s, all five gates PASS (−14.0 LUFS, peak −1.4
dBTP), the hero shot's "3.10" credited "Source: docusaurus.io", no near-blank stretch at the start (only the end fade,
26.73–27.03 s). Page gates of `example` and `example-hf` still pass with the screenshot-aware check.
