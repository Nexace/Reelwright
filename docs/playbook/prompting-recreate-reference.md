# Prompting cookbook: recreate a reference

Prompts for "make mine look like that": a reference site, a screenshot, a film you admire. Reelwright never copies another film's footage or text; it takes a look (colours, fonts, pacing, layout moves) and rebuilds it with its own scenes and your content.

## 1. From a site you own

> Draft a film from https://our-site.example. Audience: first-time visitors. 45 seconds, with voiceover.

```bash
./video.sh from-url https://our-site.example my-film
```

`from-url` reads the page without writing to it (forms, sockets and workers are blocked) and drafts a HyperFrames film from its headings, images and colours. Show the user the VO lines in `project.json` before building. Only use sites you own or have the right to show.

## 2. A look from a page or image

> Make a theme from this screenshot (`ref.png`) and use it.

```bash
./video.sh theme-from ref.png my-film       # a theme from a page url or an image: palette, fonts, radius
./video.sh themes                            # the 27 bundled themes, if one is already close
```

Open the drafted theme CSS and say what it picked. If no font is bundled for the reference, it maps to the nearest bundled family; tell the user which.

## 3. A look from a one-line brief

> Draft a theme for a luxury hotel booking app.

```bash
./video.sh theme-brief "luxury hotel booking" my-film
```

It picks a product type, a font pairing and what to avoid, offline.

## 4. Compare against the reference

> Render stills and put them next to the reference.

```bash
./video.sh stills my-film
./video.sh remix my-film                     # the same moments in three other themes and formats, one sheet
```

Read `stills/sheet.jpg` yourself and say what differs from the reference: spacing, type size, colour weight, how much is on screen at once. Fix one thing at a time and re-run `stills`.

## 5. Match the pacing, not the footage

> The reference cuts every 2 seconds on the beat. Match that rhythm.

```bash
./video.sh audio-report ref.mp4              # onsets, sections and tempo of the reference's sound
./video.sh beatgrid my-film                  # your own track's grid
```

`audio-report` prints the tempo and where the loudness steps. Put your scene starts on `KIT.snap(...)` at that spacing. Match the structure (open, climb, drop, end card), never the picture.

## 6. Final checks

- `node tools/checks/taste.page.mjs projects/my-film`: motion jerk, balance, empty space, contrast, pacing.
- `./video.sh qa my-film`: the `variety` WARN names another film in this repo with the same look; change it or say why it stays.
- Any logo, photo or text from the reference stays out unless the user owns it.
