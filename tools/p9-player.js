// p9-player.js: a tiny player over render(t), the Reelwright-native answer to Remotion's <Player> (no React, no Remotion). Load after engine.js in the
// film page itself (or in any page that has window.render): it only calls render(t), so what it shows is exactly what the film renders.
//   KIT.player({ render = window.render, fps = FILM.FPS, dur = FILM.DUR, loop = false, autoPlay = false, inFrame = 0, outFrame = last frame,
//                playbackRate = 1, volume = 1, muted = false, audio, clock }) → ref
//   audio: an <audio> element, or a src string (typically out/mix.wav); it follows the player (time re-synced when it drifts > 0.12 s).
//   clock: { raf(fn) → id, caf(id), now() } to drive it without a display (tests); default requestAnimationFrame / performance.now.
// ref (Remotion's PlayerRef, frames are whole numbers, seconds = frame / fps):
//   play() pause() toggle() isPlaying()  seekTo(frame)  getCurrentFrame()  mute() unmute() isMuted() setVolume(v) getVolume()
//   setPlaybackRate(r) getPlaybackRate() setLoop(b)  requestFullscreen(el?) exitFullscreen()  thumbnail(frame) (render one frame, state untouched)
//   advance(seconds) → Promise: step the clock by hand (what the animation frame loop calls)   dispose()
//   on(event, fn) → off()   events { frame, type }: play pause ended seeked timeupdate frameupdate ratechange volumechange fullscreenchange error
//   inFrame / outFrame bound the playable range: seekTo clamps into it, playback stops at (or, with loop, wraps from) outFrame back to inFrame.
// KIT.player.controls(ref, parent) → { el, destroy() }: a play / pause button, a frame slider and a time label, nothing else.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('p9-player.js: load tools/engine.js first');
  K.player = (o = {}) => {
    const F = window.FILM || {}, fps = o.fps ?? F.FPS ?? 30, render = o.render ?? window.render, total = Math.round((o.dur ?? F.DUR ?? 0) * fps);
    if (typeof render !== 'function' || !(total > 0)) throw new Error('player: needs a render(t) function and a duration (KIT.start sets FILM.DUR)');
    const inF = Math.max(0, o.inFrame ?? 0), outF = Math.min(total - 1, o.outFrame ?? total - 1);
    if (!(inF <= outF)) throw new Error('player: inFrame must be <= outFrame');
    const clock = o.clock || { raf: (f) => requestAnimationFrame(f), caf: (i) => cancelAnimationFrame(i), now: () => performance.now() };
    let t = inF / fps, playing = false, rate = o.playbackRate ?? 1, vol = o.volume ?? 1, muted = !!o.muted, loop = !!o.loop, last = 0, id = 0, chain = Promise.resolve(), lastFrame = -1;
    const handlers = {}, audio = typeof o.audio === 'string' ? Object.assign(new Audio(), { src: o.audio }) : o.audio || null;
    const frame = () => Math.min(outF, Math.max(inF, Math.floor(t * fps + 1e-6)));
    const emit = (type, extra) => (handlers[type] || []).slice().forEach((fn) => fn({ type, frame: frame(), ...extra }));
    const draw = () => (chain = chain.then(() => render(frame() / fps)).catch((e) => emit('error', { error: e })));
    const sync = (hard) => { if (!audio) return; audio.volume = vol; audio.muted = muted; audio.playbackRate = rate; if (hard || Math.abs(audio.currentTime - t) > 0.12) audio.currentTime = t; };
    const shown = () => { const f = frame(); if (f !== lastFrame) { lastFrame = f; emit('frameupdate'); } emit('timeupdate'); };
    const advance = (dt) => {
      if (!playing) return chain;
      t += dt * rate;
      const end = (outF + 1) / fps, span = end - inF / fps;
      if (t >= end - 1e-9) {
        if (loop) t = inF / fps + ((t - inF / fps) % span);
        else { t = outF / fps; playing = false; if (audio) audio.pause(); draw(); shown(); emit('pause'); emit('ended'); return chain; }
      }
      draw(); sync(false); shown(); return chain;
    };
    const tick = () => { if (!playing) return; const n = clock.now(); const dt = (n - last) / 1000; last = n; advance(dt); id = clock.raf(tick); };
    const ref = {
      play() { if (playing) return; if (t >= (outF + 0.999) / fps) t = inF / fps; playing = true; last = clock.now(); sync(true); if (audio) audio.play && audio.play(); emit('play'); id = clock.raf(tick); },
      pause() { if (!playing) return; playing = false; clock.caf(id); if (audio) audio.pause(); emit('pause'); },
      toggle() { playing ? ref.pause() : ref.play(); },
      isPlaying: () => playing,
      seekTo(f) { t = Math.min(outF, Math.max(inF, Math.round(f))) / fps; draw(); sync(true); emit('seeked'); shown(); return chain; },
      getCurrentFrame: frame,
      mute() { muted = true; sync(); emit('volumechange'); }, unmute() { muted = false; sync(); emit('volumechange'); }, isMuted: () => muted,
      setVolume(v) { if (!(v >= 0 && v <= 1)) throw new Error('player: volume is 0..1'); vol = v; sync(); emit('volumechange'); }, getVolume: () => vol,
      setPlaybackRate(r) { if (!(r > 0)) throw new Error('player: playback rate must be > 0'); rate = r; sync(); emit('ratechange'); }, getPlaybackRate: () => rate,
      setLoop(b) { loop = !!b; },
      requestFullscreen(el = K.stage) { return el.requestFullscreen ? el.requestFullscreen() : Promise.reject(new Error('fullscreen is not available')); },
      exitFullscreen() { return document.exitFullscreen ? document.exitFullscreen() : Promise.resolve(); },
      thumbnail(f) { const cur = frame(); return Promise.resolve(render(Math.min(total - 1, Math.max(0, Math.round(f))) / fps)).then(() => render(cur / fps)); },
      advance, on(type, fn) { (handlers[type] ||= []).push(fn); return () => { handlers[type] = handlers[type].filter((x) => x !== fn); }; },
      dispose() { playing = false; clock.caf(id); if (audio) audio.pause(); document.removeEventListener('fullscreenchange', fs); },
      fps, durationInFrames: total, inFrame: inF, outFrame: outF,
    };
    const fs = () => emit('fullscreenchange', { fullscreen: !!document.fullscreenElement });
    document.addEventListener('fullscreenchange', fs);
    draw(); sync(true); if (o.autoPlay) ref.play();
    return ref;
  };
  K.player.controls = (ref, parent = K.stage.parentNode) => {
    const el = document.createElement('div'); el.style.cssText = 'position:absolute;left:0;right:0;bottom:0;display:flex;gap:8px;align-items:center;padding:6px 10px;background:rgba(0,0,0,.6);color:#fff;font:12px sans-serif;z-index:99999';
    const btn = Object.assign(document.createElement('button'), { textContent: 'Play' }), rng = Object.assign(document.createElement('input'), { type: 'range', min: ref.inFrame, max: ref.outFrame, value: ref.getCurrentFrame() }), lab = document.createElement('span');
    rng.style.flex = '1'; el.append(btn, rng, lab); parent.appendChild(el);
    const show = () => { rng.value = ref.getCurrentFrame(); lab.textContent = `${(ref.getCurrentFrame() / ref.fps).toFixed(2)} s`; btn.textContent = ref.isPlaying() ? 'Pause' : 'Play'; };
    btn.onclick = () => ref.toggle(); rng.oninput = () => ref.seekTo(+rng.value);
    const offs = ['play', 'pause', 'timeupdate', 'seeked'].map((e) => ref.on(e, show)); show();
    return { el, destroy() { offs.forEach((f) => f()); el.remove(); } };
  };
})();
