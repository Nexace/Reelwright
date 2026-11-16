# Reading time, phrases, perceptual scale, animated images (Phase 11, P5)

Two kit modules (pure in t) and one command. Proof: `tools/selfcheck/p5/text.mjs` and `p5/media.mjs` in `node tools/selfcheck/p5-motion.mjs` (shuffled seeks in pvk and
HyperFrames), the checks in `node tools/selfcheck/p5-tools.mjs`.

## How long text must stay up

`KIT.readS(text) = max(0.7 s, 0.3 s per word)`. `KIT.chatHold(text)` adds 0.4 s for the reply beat in a chat. `KIT.paced(texts, { t0, gap, to })` lays texts one after
another, each up for its read time; with `to` the spare time is shared out by word count so the last ends at `to`, and a window that is too short throws and says how many
words to cut (cut words, not time). Words are counted on letters and digits: a lone `--` is not a word.

QA: `tools/checks/p5-readtime.page.mjs` (a WARN; silence with `"qa": {"p5-readtime": false}`) samples the film every 0.1 s and reports a text that was up for less
than its readS (`readtime 3.20-3.50s "Rated 4.8 stars" is up 0.40 s, needs 1.50 s`). A text up from the first frame, or still up at the end, passes. It also reports a caption
cue shorter than its own readS as `caption-tight ... TOO TIGHT`.

## Subtitles as phrases

`KIT.phrases('line', { min: 2, max: 6 })` cuts a VO line into 2 to 6 word phrases: sentence ends first, then commas, else near the middle; a one-word line stays one phrase. Each
phrase starts on the spoken start of its first word (`KIT.align`) and ends where the next begins, so the windows tile the line. `KIT.captionPhrases()` is the same in
the cue shape `.srt`/`.vtt` uses (`FILM.captions` still comes from `KIT.captionCues`, 42 characters; use the phrases when you set `FILM.captions` yourself) and
`KIT.subtitlePhrases(ids)` shows one phrase at a time.

## Perceptual scale

`KIT.scaleArea(a, b, p)` interpolates a scale in area space (`a*|a|` blended, then the signed square root): Remotion's `output: 'perceptual-scale'`. A linear 1 to 3 scale looks like it slows
at the end; this one reads as steady (the area grows linearly, which `p5/text.mjs` checks). `KIT.scaleKeys(t, pts, eases)` is `KIT.keys` through it.

## Animated images

```
reelwright animimg assets/party.gif --width 480      # PNG frames + party.frames.json, real frame times (ffmpeg, build time)
```
```js
const meta = await (await fetch('assets/party/party.frames.json')).json();   // or inline it as JSON in film.js
const gif = KIT.animatedImage(meta, { at: W('hook', 'party'), loopBehavior: 'loop', base: 'assets/party/', w: 480, h: 360 });
// in render(t): gif.set(t)
```

Every frame is an `<img>` loaded at start and `render(t)` makes exactly one visible, so nothing plays and seeking in any order gives the same frame.
`loopBehavior`: `loop`, `pause-after-finish`, `clear-after-finish`. `playbackRate` scales the clock, `fit` is the object-fit. At most 400 frames: thin a long
animation with `--fps` and `--width`. Any animation ffmpeg decodes works (GIF, APNG, WebP, AVIF); the frame times are the container's own (a GIF stores them in
1/100 s). Remotion's `<AnimatedImage>` and `<Gif>` are the same idea in React; this is the native version.
