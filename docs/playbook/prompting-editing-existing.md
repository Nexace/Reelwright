# Prompting cookbook: editing existing videos

Prompts for working with footage you already have: trim and place a clip, add captions, put a lower third over it, recut to a track. The clip is a layer in a film (`KIT.video`), not a file Reelwright rewrites, so every edit is a change to `film.js` and re-render. See `docs/playbook/video-audio.md` for the full option list.

## 1. Put a clip in a film

> Use `take.mp4` from 12 s to 20 s as scene 2, with its own sound under the voiceover.

```js
const S = KIT.V('scene2');
const clip = KIT.video('media/take.mp4', { id: 'take', start: S.start, dur: 8, in: 12, audio: true, volume: 0.6 });
// in render(t): position and style `clip` like any element (KIT.css(clip, {...}), KIT.show(clip, op))
```

Copy the file into `projects/<name>/media/` first. The clip's start comes from the film (`S.start`, `KIT.V('scene2').start`), never a typed second; `in` is the source second it starts from. A moment inside the clip is `S.start + (source second - 12)`.

## 2. Captions on top

> Add word-by-word captions to this clip.

For a film with its own voiceover, `KIT.subtitles([...ids])` does it from the VO words. To use a caption component instead, `captions` writes `transcript.json` ([{text, start, end}], from the film's VO words) and installs a component fed by it (words spoken inside a clip are not in that file: add them by hand in the same shape):

```bash
./video.sh captions <name> caption-pill-karaoke    # needs timeline.json (run `info`); writes transcript.json and hf/blocks/<component>.html
./video.sh catalog --tag caption-style              # the 15 caption styles
```

Check that the caption box stays out of the lower third: `node bin/reelwright.mjs check <name> --caption-zone`.

## 3. A lower third over footage

> Add a name and title lower third from 3 s to 8 s of the clip.

Use a catalog block: `./video.sh catalog --tag lower-third`, then `./video.sh add <name> lt-...`. Mount it at the clip's time: `KIT.mount('<block>', { start: S.start + 3, dur: 5, vars: { name: '...', title: '...' } })`. See `docs/playbook/nested-compositions.md`.

## 4. Recut to a track

> Cut these three clips to the beat of `song.mp3`.

```bash
./video.sh beatgrid <name>                     # music/grid.json: bars and the drop
./video.sh audio-report song.mp3 --range 20 40  # onsets in the section you want
```

Start each clip on `KIT.snap(t)` (a beat) or `KIT.snap(t, bar)` (a bar). The drop is `KIT.drop()`: cut to the loudest clip there.

## 5. Fix the sound

> The voice on this clip is quiet and the music is loud.

Set `"loudness": -14` in `project.json` (the `qa` loudness gate checks ±1 LU), keep the music duck (`music.duck_db`), and read `docs/playbook/sound.md` for per-cue gain. `./video.sh audio-report out/<name>.mp4` shows the loudness steps of a render.

## 6. What not to do

- Do not `ffmpeg`-cut the original and overwrite it. Put the original in `media/` and cut in `film.js`.
- Do not use a clip you have no rights to. Do not publish or send anything from a recording: mock it.
- After any change, `./video.sh stills <name>`, read `stills/sheet.jpg`, then `./video.sh qa <name>`.
