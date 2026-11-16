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
`transcript.json`), *Slideshow* (below), *Source* (file tree; editing only with `studio --edit-source`).
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

**Slideshow** (hyperframes:H5): a folder of your project holding images or clips (for example `photos/`) becomes a film of its own in
`slideshows/<name>/` (seconds per still, transition and its length; the project's size; a music bed, no voiceover) through the
`slideshow` command, run as a job. The film you are editing is not touched. Open it with `reelwright studio <project>/slideshows/<name>`.
The same thing from the shell: `reelwright slideshow <folder> [name] [--seconds 3] [--transition fade|slide,iris,…] [--tdur 0.6] [--zoom 0.05]`
(clips keep their own length up to `--clip-max 8` s; `hf/slides.js` holds the order and the seconds per slide). Check:
`node tools/selfcheck/slideshow.mjs` (a real render) and `slideshow-panel.mjs` (the tab, the job, the trust boundary).

**Launch flags** (remotion:2.8.1): `--open` opens the page in your browser (the OS's own opener, no shell); `--no-open` is Remotion
Studio's flag and is what happens without either; `--force-new` starts this studio on the next free port when the port is busy (without it a
busy port stops with the old message). Check: `node tools/selfcheck/studio-flags.mjs`. Remotion Studio's WebMCP tools are not built as MCP (repo rule): the next section is the same tools as plain JSON routes and a CLI.

## Agent tools without MCP (remotion:2.8.1)
Remotion Studio hands an in-browser agent a few WebMCP tools (look, select, inspect, set style, frame). Reelwright does not speak MCP, so the same
five things are one JSON route on the studio server, `POST /__agent { cmd, … }`, and a client for it: `reelwright studio [project] <command> [--port N]`
(`--port` or `PORT=`, default 4175; start the studio first). Every command prints JSON; `look` writes the picture and prints where.

| Command | Does |
|---|---|
| `frame --t S` or `--frame N` | moves the agent's playhead (0 to the film's length); open studio tabs seek to it |
| `look [--t S] [--selector CSS] [--out f.png] [--format png\|jpeg]` | a screenshot of the film at t, or cropped to one element's box (default `studio-look-<t>.png` in the current folder) |
| `inspect --selector CSS [--t S]` | how many elements match, and for the first: tag, id, classes, text, box, `visible`, 22 computed properties, inline style, and the script line it belongs to (the line whose words it holds, else the line spoken at t, as *Pick in frame*) |
| `select --line ID` / `--selector CSS` / `--clear` | the agent's selection; open tabs select that line (a selector selects the line it belongs to) |
| `set-style --selector CSS --set prop=value …` / `--reset` | an overlay, one rule per selector, `!important`, not saved: it shows in `look` and `inspect` and in open tabs, and goes away with `--reset` or when the studio stops |
| `set-style … --edit-source` | the same rule appended to the film's own `<style>` (`hf/index.html` or `film/index.html`) through the source writer, so *Undo* puts the file back; refused unless the studio itself was started with `--edit-source` |
| `state` | playhead, frame, fps, selection, overlay |

The agent looks through its own headless page (the file the `stills` and `lint` commands open, with the project's size), so no tab has to be open; it opens
again after a project file changes. Commands run one at a time. `look` and `inspect` at `--t` leave the agent's playhead there, and `state` shows it.
Not covered: the film's `window.PROPS` (the Props tab) is not set in the agent's page, and `dur` in `state` is `null` until the first command that needs the
film's length.

The route keeps the trust boundary above: 127.0.0.1, the Host check, POST with the studio's Origin and `application/json`, a fixed `cmd` list (400 otherwise),
`t` inside the film, one overlay of at most 30 rules and 20 properties, selectors and values of at most 200 characters with no braces, semicolons, `@`, `<`, `>`,
backslashes or `url()`, so a rule can neither close itself nor load anything; GET is refused (405). It never runs a shell or a job and calls no paid service;
the only write is the persisted rule. Check: `node tools/selfcheck/p15-studio-agent.mjs` (a real studio, headless browser and tab: playhead, overlay, selection,
the persisted rule and its undo, and every refusal).
