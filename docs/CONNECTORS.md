# Optional connectors: AI-generated stills and clips

Off by default. A normal build never runs this code, never needs a key and never goes online. `reelwright gen`
is a separate command you run on purpose, by hand. `all`, `film` and `audio` never call it.

Three sources, one manifest (`projects/<name>/assets/gen.json`):

| Source | How | Needs |
|---|---|---|
| Higgsfield | `gen --provider higgsfield` (paid API) | API key, internet |
| Adobe Firefly | generate in the app, then `gen --import ... --source firefly` | nothing |
| Adobe Express | export in the app, then `gen --import ... --source express` | nothing |

## Higgsfield

1. Create an API key in the Higgsfield console (https://console.higgsfield.ai). You get a key ID and a secret.
2. Give them to Reelwright, either as environment variables:
   ```bash
   export HIGGSFIELD_API_KEY_ID=...
   export HIGGSFIELD_API_KEY_SECRET=...
   ```
   or in `.reelwright/credentials.json` at the repo root (git-ignored):
   ```json
   { "HIGGSFIELD_API_KEY_ID": "...", "HIGGSFIELD_API_KEY_SECRET": "..." }
   ```
   Set `REELWRIGHT_CREDENTIALS` to use another file. Keys are sent only to Higgsfield. They are never written to
   the project, `project.json`, the manifest or the logs. Error messages name the variable, not the value.
   With a key missing, `gen` says which one, exits with code 2 and writes nothing.
3. Generate:
   ```bash
   ./video.sh gen myfilm --provider higgsfield "a paper plane over a desk, soft light" --out assets/hero.png
   ./video.sh gen myfilm --provider higgsfield --kind video "slow dolly past a laptop" --out assets/b-roll.mp4
   ./video.sh gen myfilm --provider higgsfield --model <id> "..." --out assets/x.png --yes
   ```
   Quote the prompt. `--out` must be inside the project's `assets/`. `--kind` is `image` (default) or `video`.
   `--model` is the endpoint path of a Higgsfield model; the defaults are `higgsfield-ai/soul/standard` for images
   and `kling-video/v2.5-turbo/pro/text-to-video` for video.

**Estimate, then confirm.** Higgsfield publishes no per-model prices, only an estimate endpoint that needs your
key. So `gen` asks it first, prints the estimate for your account, and waits for `y` before it submits anything.
`--yes` skips the question. `y` or `yes` submits; anything else cancels with nothing submitted.

**Cache.** The result is stored in `assets/.gen/`, keyed by provider, model, kind and prompt. Running the same
command again copies the cached file, makes no call, needs no key and costs nothing, so a film rebuilds the same
offline. Change the prompt and you pay again.

**Manifest.** `assets/gen.json` lists each asset: file, provider, model, kind, prompt, date, sha256 and the host
the file came from. No keys, no signed URLs.

`reelwright verify` covers gen assets. The build manifest hashes every project file except build output, so
`assets/*`, `assets/gen.json` and `assets/.gen/*` are checked like any other input, and `verify` names a file that
changed. It compares against `out/<name>.manifest.json`, so it works only after an encode.

**Errors.**
- 401: the key was rejected. Check both variables.
- 403: no balance. Add funds in the console.
- 429: `gen` waits for `Retry-After` and resends, up to 5 times, then gives up.
- A failed or NSFW-flagged request is reported and not charged. After a 15-minute timeout the request may still
  finish and be charged; the message gives the request id.

**Terms and privacy.** Higgsfield's terms put no restriction on commercial use of outputs, and ask you to
disclose AI output where the law requires it. Without an Enterprise Agreement, Higgsfield may train on your
inputs and outputs. Do not send prompts or images you would not want used that way.

## Label AI output on screen

Mark every generated still or clip in `film.js`:

```js
KIT.aiLabel(el)                 // el = the element that contains the image or video
KIT.aiLabel(el, 'AI-generated') // text is optional
KIT.aiLabel()                   // no element: the label goes in the stage's safe area
```

It cannot go on an `<img>` or `<video>` itself, so pass the wrapper. `qa` warns (`ai-label`, a warning, never a
failure) when a file listed in `gen.json` is on screen and no `AI-generated` label is. To turn the check off, set
`"ai-label": false` in `qa` in `project.json`.

## Adobe Firefly (manual)

The Firefly API is gated to enterprise customers (an Adobe representative and an admin role). It is not part of
Creative Cloud Pro, so Reelwright has no Firefly provider.

1. Generate in the Firefly app and download the PNG or MP4.
2. Register it:
   ```bash
   ./video.sh gen myfilm --import ~/Downloads/hero.png --source firefly "paper plane, soft light"
   ```
   The file is copied byte for byte into `assets/` (use `--out assets/<file>` to rename). No network.
3. Use it like any image or clip, and add `KIT.aiLabel`.

Firefly files carry Content Credentials, and Adobe's terms forbid removing them. `gen --import` does not touch the
file. The encode step re-renders every frame into a new mp4, so the final film does not carry them. The
credentials stay on the source file you keep; the label on screen is how the film discloses it.

## Adobe Express (manual)

Express has no generation API for individuals. Export a PNG or MP4 from Express, then:

```bash
./video.sh gen myfilm --import ~/Downloads/card.png --source express "title card"
```

Same copy, same manifest, same label.

## Adding a provider

One file in `tools/gen/<name>.mjs` exporting a default object, and the name added to `PROVIDERS` in
`tools/gen.mjs`:

```js
export default { name, envKeys: [...], models: { image, video },
  async estimate(req, creds) { return { usd } },
  async submit(req, creds)   { return { id, ... } },
  async poll(job, creds)     { return { status, urls, error } } }  // status: queued | in_progress | completed | failed | nsfw | canceled
```

`gen.mjs` handles credentials, the confirm step, the cache, the download and the manifest. Test it against a local
mock like `tools/gen/mock.mjs`; never against the real service. `node tools/gen/test.mjs` runs the existing test
with no keys and no network.
