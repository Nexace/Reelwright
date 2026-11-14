// tools/p9-player.js: KIT.player over render(t): controls API, events, inFrame / outFrame, loop, rate, audio follow, controls UI. The clock is
// injected, so every step is exact; the film itself runs the shuffled-seek check in both renderers (the player only ever calls render(t)).
export default { scripts: ["tools/p9-player.js"], dur: 4, film: `
const b = KIT.el('div', 'box', S); KIT.css(b, { top: '120px' });
KIT.start({ dur: 4, render: (t) => { b.style.left = 40 + 140 * t + 'px'; } });`,
  check: async (p) => {
    const bad = await p.evaluate(async () => {
      const K = KIT, bad = [], is = (what, ok, got) => { if (!ok) bad.push(what + ': ' + JSON.stringify(got)); };
      const seen = []; let now = 0, queue = [];
      const clock = { now: () => now, raf: (f) => { queue.push(f); return queue.length; }, caf: () => { queue = []; } };
      const frames = (fn) => async () => { await fn(); };
      const spy = async (t) => { seen.push(+t.toFixed(4)); await window.render(t); };
      const audio = { currentTime: 0, volume: 1, muted: false, playbackRate: 1, played: 0, paused: 0, play() { this.played++; }, pause() { this.paused++; } };
      const log = []; const P = K.player({ render: spy, fps: 30, dur: 4, clock, audio });
      for (const e of ['play', 'pause', 'ended', 'seeked', 'timeupdate', 'frameupdate', 'ratechange', 'volumechange']) P.on(e, (ev) => log.push(e + ':' + ev.frame));
      is('starts at frame 0, paused, 120 frames', P.getCurrentFrame() === 0 && !P.isPlaying() && P.durationInFrames === 120, P.durationInFrames);
      await P.seekTo(30);
      is('seekTo(30): frame 30, render(1), seeked + frameupdate events', P.getCurrentFrame() === 30 && seen[seen.length - 1] === 1 && log.includes('seeked:30') && log.includes('frameupdate:30') && audio.currentTime === 1, [seen.slice(-2), log, audio.currentTime]);
      P.play(); now = 500; await queue.shift()();   // half a second at rate 1
      is('play + 0.5 s = frame 45; audio follows and plays', P.isPlaying() && P.getCurrentFrame() === 45 && audio.played === 1 && Math.abs(audio.currentTime - 1.5) < 0.13 && log.includes('play:30'), [P.getCurrentFrame(), audio.played, audio.currentTime]);
      P.setPlaybackRate(2); now = 1000; await queue.shift()();
      is('rate 2: another 0.5 s moves 30 frames; ratechange emitted; audio rate set', P.getCurrentFrame() === 75 && audio.playbackRate === 2 && log.some((e) => e.startsWith('ratechange')), [P.getCurrentFrame(), audio.playbackRate]);
      P.pause(); is('pause: not playing, event, audio paused', !P.isPlaying() && log.some((e) => e.startsWith('pause')) && audio.paused >= 1, log);
      P.setVolume(0.4); P.mute();
      is('volume and mute reach the audio element and emit volumechange', audio.volume === 0.4 && audio.muted === true && P.getVolume() === 0.4 && P.isMuted() && log.filter((e) => e.startsWith('volumechange')).length === 2, [audio.volume, audio.muted]);
      try { P.setVolume(2); bad.push('volume 2 accepted'); } catch (e) { /* refused */ }
      // the range: inFrame 10, outFrame 49, no loop → stops at 49 and says ended once
      const ended = []; const R = K.player({ render: spy, fps: 30, dur: 4, inFrame: 10, outFrame: 49, clock }); R.on('ended', (e) => ended.push(e.frame));
      is('starts at inFrame; seekTo clamps into the range', R.getCurrentFrame() === 10 && (await R.seekTo(500), R.getCurrentFrame() === 49) && (await R.seekTo(-5), R.getCurrentFrame() === 10), R.getCurrentFrame());
      now = 0; R.play(); now = 10000; await queue.shift()();
      is('plays to outFrame then stops with one ended event', !R.isPlaying() && R.getCurrentFrame() === 49 && ended.length === 1 && ended[0] === 49, [R.getCurrentFrame(), ended]);
      // loop wraps into the range: 40 frames long; from 10, 50 frames later = frame 20
      const L = K.player({ render: spy, fps: 30, dur: 4, inFrame: 10, outFrame: 49, loop: true, clock }); now = 0; L.play(); now = 50 / 30 * 1000; queue = queue.slice(-1); await queue.shift()();
      is('loop wraps from outFrame back to inFrame (10 + 50 frames = 20)', L.isPlaying() && L.getCurrentFrame() === 20, L.getCurrentFrame()); L.pause();
      // thumbnail leaves the state alone
      const before = P.getCurrentFrame(); await P.thumbnail(100); is('thumbnail renders another frame but keeps the player where it was', P.getCurrentFrame() === before && seen[seen.indexOf(+(100 / 30).toFixed(4), seen.length - 4) + 1] === +(before / 30).toFixed(4), [seen.slice(-4)]);
      // controls
      const ui = K.player.controls(P, document.body); const rng = ui.el.querySelector('input'), btn = ui.el.querySelector('button');
      is('controls: slider spans the range, button says Play', rng.max === '119' && btn.textContent === 'Play', [rng.max, btn.textContent]);
      rng.value = 60; rng.oninput(); await new Promise((r) => setTimeout(r, 10)); is('controls: the slider seeks', P.getCurrentFrame() === 60, P.getCurrentFrame());
      btn.onclick(); is('controls: the button plays', P.isPlaying() && btn.textContent === 'Pause', btn.textContent); P.pause(); ui.destroy();
      try { K.player({ render: spy, fps: 30, dur: 4, inFrame: 50, outFrame: 10, clock }); bad.push('inFrame > outFrame accepted'); } catch (e) { /* refused */ }
      P.dispose(); R.dispose(); L.dispose(); await window.render(0);
      return bad;
    });
    if (bad.length) throw new Error('player check:\n  ' + bad.join('\n  '));
  } };
