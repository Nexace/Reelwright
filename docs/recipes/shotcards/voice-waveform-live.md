# Voice waveform from the audio

Bars that follow the real loudness of a voiceover or music: an envelope is dumped once, the film reads it as a pure function of t.

Source: video-shotcraft card `voice-waveform-live` (shots: voice-waveform-live). Helper: `KIT.shotcards` in `tools/shotcards/interaction.js` (see [the index](b-index.md) for loading it). Proof: `node tools/selfcheck/shotcards-b.mjs interaction` (shuffled-seek purity in both renderers, frames move, no network). The shapes, timings and numbers are our own tuning: the source card's tuned numbers were not available offline.

## When to use

- A voice-first film where the audio itself should be seen.
- Podcast clips and audiograms.

## The code

**film.js** (after the shared setup, see the [recipes README](../README.md#shared-setup); load `interaction.js` first, see the index):

```js
// once, in a terminal:  node tools/shotcards/envelope.mjs projects/mine/vo/hook.mp3 --var ENV_HOOK > projects/mine/film/env-hook.js
// film/index.html:      <script src="env-hook.js"></script>   (a film cannot fetch from file://)
const wave = KIT.shotcards.voiceWaveform({ env: window.ENV_HOOK, at: KIT.V('hook').start, bars: 41, mode: 'mirror' });
// no audio yet? KIT.shotcards.voiceWaveform.synth(seed, seconds) makes a speech-like envelope
function render(t) { wave.set(t); }
```

## Timing and easing

- The envelope is RMS per 1/30 s, scaled so its 99th percentile is 1; heights interpolate between samples, so any fps matches.
- 'mirror': the middle bar is now and the bars outwards are the recent past (`lag`); 'history': a scrolling strip, newest right. `wave.level(t)` is the loudness at t, for a glow that follows it.

## Common mistakes

- Running envelope.mjs on the final mix: use the voice file, or the bars follow the music too.
- Forgetting `at`: the envelope starts at t = `at`; give it the line's start time.

[Back to the shotcard index](b-index.md)
