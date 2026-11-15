# Studio (`reelwright studio`)

A local editor on top of the vendored HyperFrames player. It edits what Reelwright stores (the script, the gaps, the
look) and shows the result; it does not edit the film.

```
./video.sh studio [project] [--port N]     # http://localhost:4175 (PORT=… works too); runs sched first
```

## What is on the page
- **Player**: `<hyperframes-player>` (vendor/hf-player/) playing the film page (`hf/index.html` or `film/index.html`)
  with `mix.wav` as audio when it exists. The page gets the same two preview shims as `embed` (the hide-until-load
  `__timelines.main` snippet and the real-time clock), copied into `tools/studio/shims.mjs`.
- **Timeline**, drawn from the film's own `window.FILM`: scenes (each line's lead-in gap plus the line, labelled with
  the gap), VO lines (id and first words), the music beat/bar grid with the drop, and SFX cues. Click or drag to seek.
  Space plays/pauses, left/right is one frame, shift is one second. The playhead follows the player.
- **Inspector**: the selected line's `text` and `gap`; the project's `style` (every theme in `themes/`), `title` and
  `fps`; raw editors for the whole `project.json` and for `brand.json` (saving creates it).
- **Jobs**: *Still at playhead* (`stills <t>`) and *Contact sheet* (`stills`) show the image beside the player;
  *Taste* runs `tools/checks/taste.page.mjs`; *Embed* runs `embed` and links `out/embed.html`. The log pane shows the
  tail of stdout/stderr; a failed job turns the banner red.

## What a save does
Save validates, writes `project.json` / `brand.json` (tmp file, then rename), regenerates `theme.css` (and the kit for
HyperFrames films), runs `sched`, and the page reloads at the same moment. Edits made in an editor outside the studio
reload it too. If a line's text no longer matches `vo/lines.json` the page says "script changed — re-voice" and offers
`audio`; that button is the one thing that uses the network (edge-tts), and it says so. Saving rewrites
`project.json` as 2-space JSON, so hand-aligned columns are lost; use the raw editor to keep your formatting.

## What it never does
- It never writes `film.js`, `hf/*` or any animation code, and exposes no GSAP authoring (the GSAP licence).
- It writes only `<project>/project.json` and `<project>/brand.json`. Job outputs (`stills/`, `out/`, `vo/`, `mix.wav`)
  come from the repo's own commands.
- It never calls a paid service. `gen` is not reachable from it.

## Security
- Listens on `127.0.0.1` only. Every request's `Host` must be `localhost:PORT` or `127.0.0.1:PORT` (DNS rebinding).
- The only state-changing routes are `POST /__save` and `POST /__run`. They need `content-type: application/json` and an
  `Origin` equal to the studio's own origin, so another site's page can neither write nor, with the Host check, read.
- Saves must parse as a JSON object. `project.json` keeps `lines` an array of `{ id, text }` (ids `[\w-]+`, unique, gap
  0-60), a known `style`, a sane `fps`/size, and `out` inside the project; `brand.json`'s `logo` and font `src` must be
  files inside the project. A refused save changes nothing.
- Jobs come from a fixed allow-list (`sched`, `audio`, `stills`, `taste`, `embed`), started with
  `spawn(process.execPath, [...])` and no shell; the only extra argument is a validated number. One job at a time (409).
- Static GET is read-only, from the repo root (and from the project folder when it lives outside the repo); `..`
  traversal and any dot-folder (`.git`, `.reelwright/credentials.json`, `.env`) are refused.

Check: `node tools/selfcheck/studio.mjs` (about 45 s, most of it the still's render).

## Timeline tools (H3)
Tracks: scenes, VO lines, captions (one box per voiced word), the waveform and level of `mix.wav` (peak and rms at the playhead),
beats, SFX cues and nested compositions (`KIT.mount` / `KIT.block`, found by seeking the film). Click a track name to hide it.
- **Drag a scene sideways** to change its `gap` (saved to `project.json`, `sched` places the lines again; the lines after it
  move with the drag as a preview). It snaps to beats, bars, the drop, cues, line edges and the playhead within 8 px; hold Alt to
  turn snapping off (or untick *snap*).
- **Shift-drag** selects a range (length, frames, the lines in it); Esc clears it.
- **Linked selection** (on by default): selecting a line selects its scene, VO box, caption words and the cues inside it.
- **Split / Trim head / Trim tail** cut the selected line's script at the word under the playhead (not saved until you Save;
  the text changed, so re-voice).
- **Double-click** a scene or a nested composition to zoom the timeline to it; the breadcrumb goes back to the whole film.

## Right panels (H5) and Remotion-Studio-style tools (remotion:2.8.1)
Tabs: *Inspector*, *Props*, *Audio* (the FX rack: a preset or job per bus, a per-line preset, the limiter; *Remix* runs `mix`),
*Blur* (`motionBlur`), *Variables* (declared defaults), *Renders* (a queue of `film` runs from fixed option lists: format,
resolution, quality, fps, GPU, props; one at a time, cancel while queued or running), *Lint* (static HyperFrames lint and the
layout check), *Assets* (project media and `~/.media`), *Catalog* (search, Add, copy an agent prompt), *Captions* (edit
`transcript.json`), *Source* (file tree; editing only with `studio --edit-source`).
- **Undo / Redo** (Ctrl/Cmd+Z) undo every write the studio made (project.json, brand.json, props.json, transcript.json, source files),
  byte for byte, for the session.
- **Props** (Ctrl/Cmd+J): a form made from `props.schema.json` (or the declared `variables`), saved to `props.json`, checked with
  the same checks as `--props`; the player shows the film with them as `window.PROPS` (`KIT.props()`), and *Render with these props*
  queues a render with `--props-file`.
- **Canvas zoom** (+, -, 0, Ctrl/Cmd+wheel), **quick switcher** (Ctrl/Cmd+K: lines, panels, actions), **shortcut list** (?),
  **Pick in frame** (P): click an element in the frame; a text element holding a line's words selects that line, anything else
  selects the line being spoken at the playhead.
Same trust boundary for every new route: 127.0.0.1, Host check, POST needs the studio's Origin and JSON, values from fixed lists,
files only inside the project (no dot-folders, no `hf/kit/`), source writes off unless `--edit-source`.

Check: `node tools/selfcheck/p12a-studio.mjs` (real renders, about 90 s).

Not here: a Slideshow panel, Remotion Studio's WebMCP tools, a global `--no-open` / `--force-new` (the studio never opens a browser).
